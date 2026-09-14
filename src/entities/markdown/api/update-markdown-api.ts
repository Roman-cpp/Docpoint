import { invoke } from "@tauri-apps/api/core";

interface UpdateMarkdownParams {
	id: string;
	content: string;
}

/** Перезаписать тело markdown-документа. */
export function updateMarkdownApi({
	id,
	content,
}: UpdateMarkdownParams): Promise<void> {
	return invoke("update_markdown", { id, content });
}
