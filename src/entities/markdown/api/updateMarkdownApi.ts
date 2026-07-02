import { invoke } from "@tauri-apps/api/core";
import type { UpdateMarkdownDTO } from "../model/markdown.dto";

export function updateMarkdownApi(file: UpdateMarkdownDTO): Promise<string> {
	return invoke("update_markdown", { file });
}
