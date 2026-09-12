import type { Doc, Endpoint, ParamKind } from "@/entities/doc-api";
import type { Environment } from "@/entities/environment";
import { joinUrl } from "@/shared/lib/url";
import type { HeaderDraft, ParamValues } from "../model/tryIt.types";

/** Ключ значения параметра внутри набора: `${kind}:${name}`. */
export function valueKey(kind: ParamKind, name: string): string {
	return `${kind}:${name}`;
}

/** Разбирает ключ значения обратно на составляющие. */
export function splitValueKey(key: string): { kind: ParamKind; name: string } {
	const idx = key.indexOf(":");
	return { kind: key.slice(0, idx) as ParamKind, name: key.slice(idx + 1) };
}

/**
 * Значение параметра для поля формы: то, что ввёл пользователь, иначе ссылка на
 * переменную окружения, закреплённую за параметром в схеме эндпоинта.
 */
export function readValue(
	values: ParamValues,
	kind: ParamKind,
	name: string,
	envVarName?: string | null,
): string {
	return (
		values[valueKey(kind, name)] ?? (envVarName ? `{{${envVarName}}}` : "")
	);
}

/** Подставляет значения переменных окружения вместо `{{NAME}}`. */
export function resolveEnvVars(value: string, env: Environment): string {
	return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
		const found = env.value.find((v) => v.name === name);
		return found ? found.value : "";
	});
}

/** У GET и HEAD тела не бывает. */
export function canHaveBody(method: string): boolean {
	return method !== "GET" && method !== "HEAD";
}

/**
 * Итоговый URL: base URL окружения + префикс окружения + префикс документа +
 * путь эндпоинта. Любой из префиксов может быть пустым.
 */
export function buildUrl(
	endpoint: Endpoint,
	env: Environment,
	doc: Doc | null,
	values: ParamValues,
): string {
	const path = endpoint.path.replace(/\{(\w+)\}/g, (_, name) => {
		const resolved = resolveEnvVars(
			readValue(values, "path", name).trim(),
			env,
		);
		return resolved || `{${name}}`;
	});

	const query: Record<string, string> = {};
	for (const param of endpoint.queryParams ?? []) {
		const raw = readValue(values, "query", param.name, param.value).trim();
		const resolved = resolveEnvVars(raw, env);
		if (resolved) query[param.name] = resolved;
	}

	const qs = new URLSearchParams(query).toString();
	const url = joinUrl(env.baseUrl, env.prefix, doc?.prefix, path);
	return qs ? `${url}?${qs}` : url;
}

/**
 * Приводит строковое значение параметра к типу, заявленному в его схеме
 * (integer/number → число, boolean → bool). При неудаче возвращает исходную
 * строку, чтобы не терять данные.
 */
export function coerceParamValue(raw: string, type: string): unknown {
	switch (type.toLowerCase()) {
		case "integer":
		case "int":
		case "long":
		case "number":
		case "float":
		case "double": {
			const n = Number(raw);
			return raw.trim() !== "" && !Number.isNaN(n) ? n : raw;
		}
		case "boolean":
		case "bool": {
			const v = raw.trim().toLowerCase();
			if (v === "true" || v === "1") return true;
			if (v === "false" || v === "0") return false;
			return raw;
		}
		default:
			return raw;
	}
}

/** Ссылка на переменную окружения и ничего кроме неё: `{{TOKEN}}`. */
const VAR_ONLY_RE = /^\{\{(\w+)\}\}$/;

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Тело набора как JSON-объект — то, что показывает форма по полям схемы.
 * `null`, если телом нельзя управлять из формы: невалидный JSON, массив или
 * скаляр. Такое тело правится только в режиме JSON.
 */
export function parseBodyObject(body: string): JsonObject | null {
	const trimmed = body.trim();
	if (!trimmed) return {};
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return isJsonObject(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Значение поля формы для параметра тела: то, что лежит в документе, иначе
 * ссылка на переменную окружения, закреплённую за параметром в схеме.
 */
export function bodyFieldText(
	doc: JsonObject,
	name: string,
	envVarName?: string | null,
): string {
	if (!(name in doc)) return envVarName ? `{{${envVarName}}}` : "";
	const value = doc[name];
	if (value === null) return "null";
	return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Записывает поле формы в тело и возвращает новый JSON-текст. Значение
 * приводится к типу параметра прямо здесь — в документе лежит уже число или
 * булево, а не строка, которую кто-то должен разобрать при отправке. Ссылки на
 * переменные остаются строками: их подставляют перед самой отправкой.
 *
 * Ключи, которых нет в схеме, документ сохраняет — форма их не показывает, но
 * и не затирает.
 */
export function setBodyField(
	body: string,
	name: string,
	type: string,
	text: string,
): string {
	const doc = parseBodyObject(body);
	if (!doc) return body;

	if (!text.trim()) delete doc[name];
	else if (VAR_ONLY_RE.test(text.trim())) doc[name] = text.trim();
	else doc[name] = coerceParamValue(text, type);

	return Object.keys(doc).length ? JSON.stringify(doc, null, 2) : "";
}

/** Подставляет переменные окружения во всех строках документа. */
function substituteDeep(node: unknown, env: Environment): unknown {
	if (typeof node === "string") return resolveEnvVars(node, env);
	if (Array.isArray(node)) return node.map((item) => substituteDeep(item, env));
	if (isJsonObject(node)) {
		const result: JsonObject = {};
		for (const [key, value] of Object.entries(node))
			result[key] = substituteDeep(value, env);
		return result;
	}
	return node;
}

/**
 * Итоговое тело запроса, либо `null`, если отправлять нечего.
 *
 * Тело хранится готовым JSON-документом, поэтому здесь остаётся только
 * подставить переменные окружения. Исключение — поле, целиком состоящее из
 * ссылки (`{{PORT}}`): подставленное значение всегда строка, поэтому его
 * приводим к типу из схемы, иначе числовое поле уехало бы строкой.
 *
 * Невалидный JSON уходит как есть, с одной лишь подстановкой переменных:
 * режим JSON всегда отправлял ровно то, что набрал пользователь, — тело
 * может быть и не JSON вовсе.
 */
export function resolveRequestBody(
	endpoint: Endpoint,
	env: Environment,
	body: string,
): string | null {
	if (!canHaveBody(endpoint.method)) return null;

	const trimmed = body.trim();
	if (!trimmed) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return resolveEnvVars(trimmed, env);
	}

	if (!isJsonObject(parsed)) return JSON.stringify(substituteDeep(parsed, env));

	const types = new Map(
		(endpoint.bodyParams ?? []).map((param) => [param.name, param.type]),
	);

	const result: JsonObject = {};
	for (const [key, value] of Object.entries(parsed)) {
		const type = types.get(key);
		if (type && typeof value === "string" && VAR_ONLY_RE.test(value.trim()))
			result[key] = coerceParamValue(resolveEnvVars(value, env), type);
		else result[key] = substituteDeep(value, env);
	}

	return JSON.stringify(result);
}

/**
 * Заголовки запроса: дефолты, поверх них — заданные пользователем (имена
 * сравниваются без учёта регистра). Токен авторизации подставляет бэкенд, но
 * только если пользователь не задал `Authorization` сам.
 */
export function buildHeaders(
	headers: HeaderDraft[],
	env: Environment,
	body: string | null,
): Record<string, string> {
	// `*/*` в хвосте обязателен: голый `application/json` отсекает всё, что
	// смотрит на Accept — SPA-фоллбэк дев-сервера отдаёт на него пустой 404
	// вместо страницы, и в панели ответ выглядит пустым без причины.
	const result: Record<string, string> = {
		Accept: "application/json, */*;q=0.8",
	};
	if (body !== null) result["Content-Type"] = "application/json";

	for (const header of headers) {
		const name = header.name.trim();
		if (!header.enabled || !name) continue;

		for (const existing of Object.keys(result)) {
			if (existing.toLowerCase() === name.toLowerCase())
				delete result[existing];
		}
		result[name] = resolveEnvVars(header.value, env);
	}

	return result;
}
