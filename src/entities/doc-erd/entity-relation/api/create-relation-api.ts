import { invoke } from "@tauri-apps/api/core";
import type { RelationEndpoints } from "../model/entity-relation.type";

/** Создаёт связь между двумя полями, возвращая её id. */
export function createRelationApi(
	relation: RelationEndpoints,
): Promise<string> {
	return invoke("create_relation", { relation });
}
