import { invoke } from "@tauri-apps/api/core";
import type { CreateNodeDTO } from "@/entities/catalog";
import type { CreateGroupDTO } from "@/entities/doc-api";

/** Заголовок файла импорта: собственные поля документа. Место в дереве в файле
 *  не хранится — его задаёт открытый каталог. */
export interface ImportDocMeta {
	/** Id документа. По нему импорт находит документ, в который файл уже
	 *  заливали, и обновляет его вместо того, чтобы завести рядом второй.
	 *  Файла без id это не касается — он каждый раз создаёт новый документ. */
	id?: string;
	name: string;
	prefix?: string;
}

/** Разобранный файл импорта doc-api. */
export interface ImportDocPayload {
	doc: ImportDocMeta;
	groups: CreateGroupDTO[];
}

/** Куда положить импортируемый документ. */
export interface ImportTarget {
	platformId: string;
	parentId: string | null;
}

/** Итог импорта: документ выбрал сам файл, поэтому в отчёте есть и он. */
export interface ImportDocReport {
	docId: string;
	docName: string;
	/** `true` — документа с таким id не было, и он заведён этим импортом. */
	created: boolean;
	groupsAdded: number;
	endpointsAdded: number;
	endpointsUpdated: number;
}

/** Заливает файл в документ с его id: если такого документа ещё нет — создаёт
 *  его под тем же id, если есть — дописывает в него разницу. */
export function importDocApi(
	payload: ImportDocPayload,
	target: ImportTarget,
): Promise<ImportDocReport> {
	const node: CreateNodeDTO = {
		id: payload.doc.id ?? null,
		platformId: target.platformId,
		parentId: target.parentId,
		name: payload.doc.name,
		payload: {
			kind: "docApi",
			prefix: payload.doc.prefix ?? "",
		},
	};

	return invoke("import_doc", { node, groups: payload.groups });
}
