import { invoke } from "@tauri-apps/api/core";

/** Open a native save dialog and write `content` to the chosen path — an export
 *  out of the app, unrelated to the vault. Resolves to `true` when saved,
 *  `false` when the user cancelled. */
export function exportMarkdownApi(
	content: string,
	filename: string,
): Promise<boolean> {
	return invoke("export_markdown", { content, filename });
}
