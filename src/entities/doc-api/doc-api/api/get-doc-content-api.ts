import { invoke } from "@tauri-apps/api/core";

/** Read the markdown body of a doc. Resolves to "" when the doc has no body yet. */
export function getDocContentApi(id: string): Promise<string> {
	return invoke("read_doc_content", { id });
}
