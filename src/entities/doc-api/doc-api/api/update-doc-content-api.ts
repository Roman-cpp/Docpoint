import { invoke } from "@tauri-apps/api/core";

/** Записать markdown-тело документа в его файл `<id>.md`. */
export function updateDocContentApi(
	id: string,
	content: string,
): Promise<void> {
	return invoke("write_doc_content", { id, content });
}
