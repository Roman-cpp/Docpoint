import { invoke } from "@tauri-apps/api/core";
import type { Endpoint, Group } from "@/entities/doc-api";
import { getDocApi, getGroupsApi } from "@/entities/doc-api";

/**
 * Тело в файле — настоящий JSON-объект, а не строка с экранированными
 * кавычками: файл читают и правят руками. Тело, которое JSON не является
 * (форма, XML, текст), остаётся строкой — другого способа его записать нет.
 */
function asDocument(body: string): unknown {
	try {
		return JSON.parse(body);
	} catch {
		return body;
	}
}

/** Эндпоинт для файла: пустые секции в него не попадают. */
function forFile(endpoint: Endpoint) {
	return {
		...endpoint,
		body: endpoint.body ? asDocument(endpoint.body) : undefined,
		bodyFields: endpoint.bodyFields?.length ? endpoint.bodyFields : undefined,
	};
}

/** Собирает документ со всеми связанными данными и сохраняет его как JSON-файл
 *  в том же формате, что принимает importDocApi (ImportDocPayload). */
export async function exportDoc(docId: string, docName: string): Promise<void> {
	const [doc, groups] = await Promise.all([
		getDocApi({ id: docId }),
		getGroupsApi({ docId }),
	]);

	const forExport = (groups ?? []).map((group: Group) => ({
		...group,
		endpoints: group.endpoints.map(forFile),
	}));

	const content = JSON.stringify({ doc, groups: forExport }, null, 2);
	const filename = `${docName.replace(/\s+/g, "_")}.json`;
	await invoke("save_json_file", { content, filename });
}
