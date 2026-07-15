import { invoke } from "@tauri-apps/api/core";
import type { Markdown } from "../model/markdown.entity";

export function getMarkdownApi(id: string): Promise<Markdown | null> {
	return invoke("read_markdown", { id });
}
