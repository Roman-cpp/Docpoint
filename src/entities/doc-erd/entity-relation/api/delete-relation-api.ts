import { invoke } from "@tauri-apps/api/core";
import type { RelationEndpoints } from "../model/entity-relation.type";

/** Удаляет связь, адресуя её парой концов, — на них в БД стоит UNIQUE. */
export function deleteRelationApi(relation: RelationEndpoints): Promise<void> {
	return invoke("delete_relation", { relation });
}
