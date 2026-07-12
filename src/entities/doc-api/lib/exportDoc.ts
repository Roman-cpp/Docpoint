import { invoke } from "@tauri-apps/api/core";
import { readEntitiesApi } from "@/entities/entity";
import { readGroupsApi } from "@/entities/group";
import { readDocApi } from "../api/readDocApi";
import { readEnvironmentsByDocApi } from "../api/readEnvironmentsByDocApi";

/** Собирает документ со всеми связанными данными и сохраняет его как JSON-файл
 *  в том же формате, что принимает importDocApi (ImportDocPayload). */
export async function exportDoc(docId: string, docName: string): Promise<void> {
	const [doc, groups, entities, environments] = await Promise.all([
		readDocApi(docId),
		readGroupsApi(docId),
		readEntitiesApi(docId),
		readEnvironmentsByDocApi(docId),
	]);
	const content = JSON.stringify(
		{ doc, groups, entities, environments },
		null,
		2,
	);
	const filename = `${docName.replace(/\s+/g, "_")}.json`;
	await invoke("save_json_file", { content, filename });
}
