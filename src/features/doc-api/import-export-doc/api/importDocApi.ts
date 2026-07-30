import { invoke } from "@tauri-apps/api/core";
import type { CreateDocDTO, CreateGroupDTO } from "@/entities/doc-api";

export type ImportDocPayload = {
	doc: CreateDocDTO;
	groups: CreateGroupDTO[];
};

export function importDocApi(payload: ImportDocPayload): Promise<string> {
	return invoke("import_doc", payload);
}
