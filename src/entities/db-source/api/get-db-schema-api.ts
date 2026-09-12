import { invoke } from "@tauri-apps/api/core";
import type { DbConnectionDTO } from "../model/db-source.dto";
import type { DbSchema } from "../model/db-source.type";

interface GetDbSchemaParams {
	conn: DbConnectionDTO;
	schema: string | null;
}

/**
 * Снимок схемы внешней базы. Читается только системный каталог — ни одной
 * строки пользовательских таблиц.
 */
export function getDbSchemaApi({
	conn,
	schema,
}: GetDbSchemaParams): Promise<DbSchema> {
	return invoke("db_introspect", { conn, schema });
}
