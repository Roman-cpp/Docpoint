import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "../model/type";

export function readAllDocs(): Promise<Doc[]> {
	return invoke("read_docs");
}

export function readDoc(id: string): Promise<Doc | null> {
	return invoke("read_doc", { id });
}

export function writeDoc(doc: Omit<Doc, "id">): Promise<string> {
	return invoke("create_doc", { doc });
}

export function deleteDoc(id: string): Promise<void> {
	return invoke("delete_doc", { id });
}
