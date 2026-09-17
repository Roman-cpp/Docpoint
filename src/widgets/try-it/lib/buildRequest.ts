import type {
	Doc,
	DocumentNode,
	Endpoint,
	ParamKind,
} from "@/entities/doc-api";
import { buildDocumentTree, childPath, itemPath } from "@/entities/doc-api";
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
 * Типы полей тела по их пути: уточнение из примечания, иначе тип из самого
 * документа схемы. Нужны для полей, целиком состоящих из ссылки на переменную:
 * подставленное значение всегда строка, и без типа числовое поле уехало бы
 * строкой.
 */
function bodyTypes(endpoint: Endpoint): Map<string, string> {
	const tree = buildDocumentTree(
		endpoint.body ?? "",
		endpoint.bodyFields ?? [],
	);
	const types = new Map<string, string>();

	const walk = (nodes: DocumentNode[]) => {
		for (const node of nodes) {
			types.set(node.path, node.format || node.type);
			walk(node.children);
		}
	};
	walk(tree.nodes);

	return types;
}

/**
 * Подставляет переменные окружения во всех строках документа, приводя поле к
 * его типу там, где значение — целиком ссылка. Путь считается по дороге, так
 * что вложенное поле приводится так же, как поле верхнего уровня.
 */
function substituteDeep(
	node: unknown,
	path: string,
	env: Environment,
	types: Map<string, string>,
): unknown {
	if (typeof node === "string") {
		const text = node.trim();
		if (!VAR_ONLY_RE.test(text)) return resolveEnvVars(node, env);

		const resolved = resolveEnvVars(text, env);
		const type = types.get(path);
		return type ? coerceParamValue(resolved, type) : resolved;
	}
	if (Array.isArray(node)) {
		return node.map((item) => substituteDeep(item, itemPath(path), env, types));
	}
	if (isJsonObject(node)) {
		const result: JsonObject = {};
		for (const [key, value] of Object.entries(node))
			result[key] = substituteDeep(value, childPath(path, key), env, types);
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

	return JSON.stringify(substituteDeep(parsed, "", env, bodyTypes(endpoint)));
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
