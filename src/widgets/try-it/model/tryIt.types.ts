import type { BodyMode } from "@/entities/doc-api";
import type { HeaderDraft } from "@/shared/ui-kit/controls";

export type { HeaderDraft };

/**
 * Значения path- и query-параметров одного набора, индексированные ключом
 * `${kind}:${name}` (см. `valueKey` / `splitValueKey`). Тело хранится отдельно,
 * в `RequestDraft.body`.
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
	body: string;
	headers: HeaderDraft[];
	values: ParamValues;
}
