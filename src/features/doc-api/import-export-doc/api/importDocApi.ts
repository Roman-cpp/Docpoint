import { invoke } from "@tauri-apps/api/core";
import type { CreateDocDTO, CreateGroupDTO } from "@/entities/doc-api";
import type { CreateEntityDTO } from "@/entities/doc-erd";
import type { CreateEnvironmentDTO } from "@/entities/environment";

export type ImportDocPayload = {
	doc: CreateDocDTO;
	groups: CreateGroupDTO[];
	entities: CreateEntityDTO[];
	environments: CreateEnvironmentDTO[];
};

export function importDocApi(payload: ImportDocPayload): Promise<string> {
	return invoke("import_doc", payload);
}
