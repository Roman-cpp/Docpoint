import { invoke } from "@tauri-apps/api/core";

/** Fields needed to create a new markdown file in the vault. */
export interface CreateMarkdownInput {
	/** Target directory inside the vault. Empty string writes to the root. */
	folder: string;
	/** File name including the `.md` extension. */
	name: string;
	author: string;
	content: string;
}

/** Create a new markdown file in the vault. Resolves to the new file's
 *  vault-relative id, or rejects when a file already exists at that path. */
export function createMarkdownApi(file: CreateMarkdownInput): Promise<string> {
	return invoke("create_markdown", { file });
}
