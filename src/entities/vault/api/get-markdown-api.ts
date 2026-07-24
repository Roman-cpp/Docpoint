import { invoke } from "@tauri-apps/api/core";
import type { FileScope } from "@/entities/shared/file-scope";
import type { Markdown } from "../model/markdown.entity";

/** Read a markdown file with its body, or `null` when it does not exist. */
export function getMarkdownApi(
	scope: FileScope,
	path: string,
): Promise<Markdown | null> {
	return invoke("read_markdown", { scope, path });
}
