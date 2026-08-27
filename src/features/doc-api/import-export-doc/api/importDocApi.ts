import { invoke } from "@tauri-apps/api/core";
import type { CreateNodeDTO } from "@/entities/catalog";
import type { CreateGroupDTO } from "@/entities/doc-api";

/** Заголовок файла импорта: собственные поля документа. Место в дереве в файле
 *  не хранится — его задаёт открытый каталог. */
export interface ImportDocMeta {
	name: string;
	version?: string;
	desc?: string;
	prefix?: string;
	tags?: string[];
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

/** Создаёт узел doc-api из файла и заливает в него группы с эндпоинтами. */
export function importDocApi(
	payload: ImportDocPayload,
	target: ImportTarget,
): Promise<string> {
	const node: CreateNodeDTO = {
		platformId: target.platformId,
		parentId: target.parentId,
		name: payload.doc.name,
		desc: payload.doc.desc ?? "",
		payload: {
			kind: "docApi",
			version: payload.doc.version ?? "",
			prefix: payload.doc.prefix ?? "",
			tags: payload.doc.tags ?? [],
		},
	};

	return invoke("import_doc", { node, groups: payload.groups });
}
