import { invoke } from "@tauri-apps/api/core";
import type { Doca } from "@/entities/doca";
import type { Group } from "@/entities/group";
import type { Entity } from "@/entities/entity";
import type { EnvConfig } from "@/entities/env-config";

export function writeDoca(doca: Doca): Promise<void> {
	return invoke("db_write_doca", { doca });
}

export function writeGroups(docaId: string, groups: Group[]): Promise<void> {
	return invoke("db_write_groups", { docaId, groups });
}

export function writeSchemas(docaId: string, schemas: Entity[]): Promise<void> {
	return invoke("db_write_schemas", { docaId, schemas });
}

export function writeEnvConfigs(docaId: string, configs: EnvConfig[]): Promise<void> {
	return invoke("db_write_env_configs", { docaId, configs });
}

export function deleteDoca(id: string): Promise<void> {
	return invoke("db_delete_doca", { id });
}
