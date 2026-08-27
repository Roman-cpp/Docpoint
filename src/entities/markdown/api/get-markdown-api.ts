import { invoke } from "@tauri-apps/api/core";
import type { Markdown } from "../model/markdown.entity";

/** Markdown-документ с телом, или `null`, если узла нет или это не markdown. */
export function getMarkdownApi(id: string): Promise<Markdown | null> {
	return invoke("read_markdown", { id });
}
