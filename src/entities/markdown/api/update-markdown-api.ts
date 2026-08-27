import { invoke } from "@tauri-apps/api/core";

/** Перезаписать тело markdown-документа. */
export function updateMarkdownApi(id: string, content: string): Promise<void> {
	return invoke("update_markdown", { id, content });
}
