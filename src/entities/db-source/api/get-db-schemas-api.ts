import { invoke } from "@tauri-apps/api/core";
import type { DbConnectionDTO } from "../model/db-source.dto";

/** Схемы PostgreSQL или базы MySQL, видимые под этими реквизитами. */
export function getDbSchemasApi(conn: DbConnectionDTO): Promise<string[]> {
	return invoke("db_list_schemas", { conn });
}
