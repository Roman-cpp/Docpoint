import { invoke } from "@tauri-apps/api/core";
import { getDocApi, getGroupsApi } from "@/entities/doc-api";
import { getEntitiesApi } from "@/entities/doc-erd";
import { getEnvironmentsByDocApi } from "@/entities/environment";

/** Собирает документ со всеми связанными данными и сохраняет его как JSON-файл
 *  в том же формате, что принимает importDocApi (ImportDocPayload). */
export async function exportDoc(docId: string, docName: string): Promise<void> {
	const [doc, groups, entities, environments] = await Promise.all([
		getDocApi(docId),
		getGroupsApi(docId),
		getEntitiesApi(docId),
		getEnvironmentsByDocApi(docId),
	]);
	const content = JSON.stringify(
		{ doc, groups, entities, environments },
		null,
		2,
	);
	const filename = `${docName.replace(/\s+/g, "_")}.json`;
	await invoke("save_json_file", { content, filename });
}
