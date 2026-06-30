import { invoke } from "@tauri-apps/api/core";
import { readDocApi, readEnvironmentsByDocApi } from "@/entities/doc-api";
import { readEntitiesApi } from "@/entities/entity";
import { readGroupsApi } from "@/entities/group";

/** Собирает документ со всеми связанными данными и сохраняет его как JSON-файл. */
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
