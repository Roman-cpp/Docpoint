import { invoke } from "@tauri-apps/api/core";
import type { Doca } from "@/entities/doca";
import type { Group } from "@/entities/group";
import type { Entity } from "@/entities/entity";
import type { EnvConfig } from "@/entities/env-config";

export function readAllDocs(): Promise<Doca[]> {
	return invoke("db_read_docs");
}

export function readAllDocaIds(): Promise<string[]> {
	return invoke("db_list_doca_ids");
}

export function readDoca(id: string): Promise<Doca | null> {
	return invoke("db_read_doca", { id });
}

export function readGroups(docaId: string): Promise<Group[]> {
	return invoke("db_read_groups", { docaId });
}

export function readSchemas(docaId: string): Promise<Entity[]> {
	return invoke("db_read_schemas", { docaId });
}

export function readEnvConfigs(docaId: string): Promise<EnvConfig[]> {
	return invoke("db_read_env_configs", { docaId });
}
