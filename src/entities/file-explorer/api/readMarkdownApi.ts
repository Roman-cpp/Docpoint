import { invoke } from "@tauri-apps/api/core";

/** A markdown file with its full body, as returned by `read_markdown`. */
export interface MarkdownContent {
	/** Vault-relative path with `/` separators, used as the stable id. */
	id: string;
	/** Parent directory inside the vault, empty string for files at the root. */
	folder: string;
	name: string;
	author: string;
	/** Body of the document, frontmatter stripped. */
	content: string;
	/** Size of the file on disk, in bytes. */
	size: number;
	/** Last modification time, unix seconds. */
	updated: number;
}

/** Read a single markdown file by its vault-relative id. Resolves to `null`
 *  when no file exists at that path. */
export function readMarkdownApi(id: string): Promise<MarkdownContent | null> {
	return invoke("read_markdown", { id });
}
