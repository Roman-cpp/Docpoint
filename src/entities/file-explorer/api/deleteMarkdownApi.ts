import { invoke } from "@tauri-apps/api/core";

/** Delete a single file by its vault-relative id. */
export function deleteMarkdownApi(id: string): Promise<void> {
	return invoke("delete_markdown", { id });
}
