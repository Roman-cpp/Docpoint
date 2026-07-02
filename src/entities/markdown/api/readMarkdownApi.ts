import { invoke } from "@tauri-apps/api/core";
import type { Markdown } from "../model/markdown.type";

export function readMarkdownApi(id: string): Promise<Markdown | null> {
	return invoke("read_markdown", { id });
}
