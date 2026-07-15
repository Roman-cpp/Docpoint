import { invoke } from "@tauri-apps/api/core";
import type { CreateMarkdownDTO } from "../model/markdown.dto";

export function createMarkdownApi(file: CreateMarkdownDTO): Promise<string> {
	return invoke("create_markdown", { file });
}
