import { invoke } from "@tauri-apps/api/core";
import type { CreateEntityDTO } from "@/entities/entity";
import type { CreateEnvironmentDTO } from "@/entities/environment";
import type { CreateGroupDTO } from "@/entities/group";
import type { CreateDocDTO, Doc } from "../model/type";

export function readAllDocs(): Promise<Doc[]> {
	return invoke("read_docs");
}

export function readDoc(id: string): Promise<Doc | null> {
	return invoke("read_doc", { id });
}

export function writeDoc(doc: CreateDocDTO): Promise<string> {
	return invoke("create_doc", { doc });
}

export function deleteDoc(id: string): Promise<void> {
	return invoke("delete_doc", { id });
}

export function importDoc(payload: {
	doc: CreateDocDTO;
	groups: CreateGroupDTO[];
	entities: CreateEntityDTO[];
	environments: CreateEnvironmentDTO[];
}): Promise<string> {
	return invoke("import_doc", payload);
}
