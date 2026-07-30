import { invoke } from "@tauri-apps/api/core";
import { getDocApi, getGroupsApi } from "@/entities/doc-api";

/** Собирает документ со всеми связанными данными и сохраняет его как JSON-файл
 *  в том же формате, что принимает importDocApi (ImportDocPayload). */
export async function exportDoc(docId: string, docName: string): Promise<void> {
	const [doc, groups] = await Promise.all([
		getDocApi(docId),
		getGroupsApi(docId),
	]);
	const content = JSON.stringify({ doc, groups }, null, 2);
	const filename = `${docName.replace(/\s+/g, "_")}.json`;
	await invoke("save_json_file", { content, filename });
}
