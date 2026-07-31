import type { BodyMode } from "@/entities/doc-api";

/**
 * Значения параметров одного набора, индексированные ключом `${kind}:${name}`
 * (см. `valueKey` / `splitValueKey`).
 */
export type ParamValues = Record<string, string>;

/**
 * Заголовок в редакторе. `id` локальный — нужен только как React-ключ,
 * в БД заголовки хранятся списком с порядком.
 */
export interface HeaderDraft {
	id: string;
	name: string;
	value: string;
	enabled: boolean;
}

/**
 * Именованный набор параметров запроса — локальное представление
 * `EndpointRequest`. Несколько наборов позволяют держать разные варианты
 * одного и того же запроса и быстро переключаться между ними.
 */
export interface RequestDraft {
	id: string;
	name: string;
	bodyMode: BodyMode;
	rawBody: string;
	headers: HeaderDraft[];
	values: ParamValues;
}
