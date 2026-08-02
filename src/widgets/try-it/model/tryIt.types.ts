import type { BodyMode } from "@/entities/doc-api";
import type { HeaderDraft } from "@/shared/ui-kit/controls";

export type { HeaderDraft };

/**
 * Значения параметров одного набора, индексированные ключом `${kind}:${name}`
 * (см. `valueKey` / `splitValueKey`).
 */
export type ParamValues = Record<string, string>;

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
