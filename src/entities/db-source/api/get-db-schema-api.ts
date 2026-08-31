import { invoke } from "@tauri-apps/api/core";
import type { DbConnectionDTO } from "../model/db-source.dto";
import type { DbSchema } from "../model/db-source.entity";

/**
 * Снимок схемы внешней базы. Читается только системный каталог — ни одной
 * строки пользовательских таблиц.
 */
export function getDbSchemaApi(
	conn: DbConnectionDTO,
	schema: string | null,
): Promise<DbSchema> {
	return invoke("db_introspect", { conn, schema });
}
