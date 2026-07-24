import { invoke } from "@tauri-apps/api/core";
import type { FileScope } from "@/entities/shared/file-scope";

/** Overwrite the body of an existing file. */
export function updateMarkdownApi(
	scope: FileScope,
	path: string,
	content: string,
): Promise<void> {
	return invoke("update_markdown", { scope, path, content });
}
