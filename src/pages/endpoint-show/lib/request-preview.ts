import type { Endpoint, Param } from "@/entities/doc-api";
import { extractPathParams } from "@/entities/doc-api";
import { joinUrl } from "@/shared/lib/url";

/**
 * Запрос, собранный по одной документации: без значений «Try it» и без
 * подстановки переменных окружения. Отсюда растут примеры кода — они
 * показывают форму вызова, а не конкретный прогон.
 */
export interface RequestPreview {
	method: string;
	/** Полный URL: база окружения + префикс документа + путь со значениями. */
	url: string;
	/** Путь эндпоинта с подставленными сегментами, без базы — для шапки. */
	path: string;
	headers: [string, string][];
	/** Тело в виде готового JSON-текста; `null` — тела у метода нет. */
	body: string | null;
}

/** Методы, у которых тела не бывает: пример с телом сбивал бы с толку. */
const BODYLESS = new Set(["GET", "HEAD", "DELETE", "OPTIONS"]);

const isNumeric = (type: string): boolean =>
	["number", "integer", "int", "long", "float", "double", "decimal"].includes(
		type.toLowerCase(),
	);

const isBoolean = (type: string): boolean =>
	["boolean", "bool"].includes(type.toLowerCase());

/**
 * Значение-заглушка по типу параметра. Строка превращается в `<имя>` — сразу
 * видно, что подставить, и подстановка не притворяется настоящими данными.
 */
function sampleValue(param: Param): unknown {
	const fallback = param.default?.trim();
	if (fallback) {
		if (isNumeric(param.type) && Number.isFinite(Number(fallback))) {
			return Number(fallback);
		}
		if (isBoolean(param.type)) return fallback === "true";
		return fallback;
	}

	const type = param.type.toLowerCase();
	if (isNumeric(type)) return 0;
	if (isBoolean(type)) return true;
	if (type === "array") return [];
	if (type === "object") return {};
	if (type === "uuid") return "00000000-0000-0000-0000-000000000000";
	if (type === "datetime" || type === "date-time")
		return "2026-01-01T00:00:00Z";
	if (type === "date") return "2026-01-01";
	return `<${param.name}>`;
}

/** В URL всё едет текстом, поэтому число и булево здесь просто печатаются. */
const asText = (value: unknown): string =>
	typeof value === "string" ? value : JSON.stringify(value);

/**
 * Подставляет в путь описанные сегменты. Неописанный сегмент остаётся
 * `{name}` — ровно как его показывает панель «Try it», чтобы было видно,
 * чего не хватает.
 */
function fillPath(endpoint: Endpoint): string {
	const described = new Map(
		(endpoint.pathParams ?? []).map((param) => [param.name, param]),
	);

	return extractPathParams(endpoint.path).reduce((path, name) => {
		const param = described.get(name);
		const value = param ? asText(sampleValue(param)) : `{${name}}`;
		return path.replace(`{${name}}`, value);
	}, endpoint.path);
}

/**
 * Параметры строки запроса для примера: обязательные и те, у кого есть
 * значение по умолчанию. Необязательные без умолчания в сниппет не идут —
 * иначе пример превращается в перечень всех возможных фильтров.
 */
function buildQuery(params: Param[]): string {
	const search = new URLSearchParams();
	for (const param of params) {
		if (!param.required && !param.default?.trim()) continue;
		search.set(param.name, asText(sampleValue(param)));
	}
	const query = search.toString();
	return query === "" ? "" : `?${decodeURIComponent(query)}`;
}

/** Тело примера: объект по описанным полям схемы. */
function buildBody(params: Param[]): string | null {
	if (params.length === 0) return null;
	const body: Record<string, unknown> = {};
	for (const param of params) body[param.name] = sampleValue(param);
	return JSON.stringify(body, null, 2);
}

interface PreviewInput {
	endpoint: Endpoint;
	/** База выбранного окружения вместе с его префиксом. */
	baseUrl?: string;
	/** Префикс документа — он дописывается после префикса окружения. */
	docPrefix?: string;
}

export function buildRequestPreview({
	endpoint,
	baseUrl,
	docPrefix,
}: PreviewInput): RequestPreview {
	const path = fillPath(endpoint) + buildQuery(endpoint.queryParams ?? []);
	const body = BODYLESS.has(endpoint.method)
		? null
		: buildBody(endpoint.bodyParams ?? []);

	const headers: [string, string][] = [];
	if (body !== null) headers.push(["Content-Type", "application/json"]);
	headers.push(["Accept", "application/json"]);
	// Схема авторизации живёт в окружении, документация знает только сам факт —
	// поэтому в примере стоит самый обычный bearer-заголовок.
	if (endpoint.auth) headers.push(["Authorization", "Bearer <token>"]);

	return {
		method: endpoint.method,
		url: joinUrl(baseUrl, docPrefix, path) || path,
		path,
		headers,
		body,
	};
}
