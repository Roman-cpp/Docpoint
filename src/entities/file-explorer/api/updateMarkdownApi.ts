import { invoke } from "@tauri-apps/api/core";

/** Fields needed to overwrite an existing markdown file in the vault. */
export interface UpdateMarkdownInput {
	/** Vault-relative path of the file to update. */
	id: string;
	author: string;
	content: string;
}

/** Overwrite the author and body of an existing markdown file. Resolves to the
 *  file's vault-relative id, or rejects when no file exists at that path. */
export function updateMarkdownApi(file: UpdateMarkdownInput): Promise<string> {
	return invoke("update_markdown", { file });
}
