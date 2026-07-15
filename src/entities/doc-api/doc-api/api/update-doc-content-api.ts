import { invoke } from "@tauri-apps/api/core";

/** Persist the markdown body of a doc to its `<id>.md` file in the vault. */
export function updateDocContentApi(
	id: string,
	content: string,
): Promise<void> {
	return invoke("write_doc_content", { id, content });
}
