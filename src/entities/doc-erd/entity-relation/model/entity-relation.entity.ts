/**
 * A directed relation between two entity fields: the primary-key side (`from`)
 * to the foreign-key side (`to`). Mirrors the `EntityRelation` returned by the
 * `read_relations` Tauri command.
 */
export interface EntityRelation {
	id: string;
	fromEntity: string;
	fromField: string;
	toEntity: string;
	toField: string;
}
