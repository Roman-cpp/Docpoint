import { invoke } from "@tauri-apps/api/core";
import type { Markdown } from "../model/markdown.type";

interface GetMarkdownParams {
	id: string;
}

/** Markdown-документ с телом, или `null`, если узла нет или это не markdown. */
export function getMarkdownApi({
	id,
}: GetMarkdownParams): Promise<Markdown | null> {
	return invoke("read_markdown", { id });
}
