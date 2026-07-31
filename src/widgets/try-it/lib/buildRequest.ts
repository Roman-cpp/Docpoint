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

/** Имена path-параметров, объявленных в пути эндпоинта: `/users/{id}`. */
export function extractPathParams(path: string): string[] {
	return [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
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

/** Тело запроса из полей `bodyParams`, либо `null`, если отправлять нечего. */
export function buildBody(
	endpoint: Endpoint,
	env: Environment,
	values: ParamValues,
): string | null {
	if (!canHaveBody(endpoint.method) || !endpoint.bodyParams?.length)
		return null;

	const body: Record<string, unknown> = {};
	for (const param of endpoint.bodyParams) {
		const raw = readValue(values, "body", param.name, param.value).trim();
		const resolved = resolveEnvVars(raw, env);
		if (resolved) body[param.name] = coerceParamValue(resolved, param.type);
	}

	return Object.keys(body).length ? JSON.stringify(body) : null;
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
	const result: Record<string, string> = { Accept: "application/json" };
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
