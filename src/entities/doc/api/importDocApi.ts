import { invoke } from "@tauri-apps/api/core";
import type { CreateEntityDTO } from "@/entities/entity";
import type { CreateEnvironmentDTO } from "@/entities/environment";
import type { CreateGroupDTO } from "@/entities/group";
import type { CreateDocDTO } from "../model/type";

export function importDocApi(payload: {
	doc: CreateDocDTO;
	groups: CreateGroupDTO[];
	entities: CreateEntityDTO[];
	environments: CreateEnvironmentDTO[];
}): Promise<string> {
	return invoke("import_doc", payload);
}
