import { invoke } from "@tauri-apps/api/core";
import type { DbConnectionDTO } from "@/entities/db-source/@x/doc-erd/compare";
import type { ErdDiff } from "../model/erd-diff.type";

interface CompareErdWithDbParams {
	docErdId: string;
	conn: DbConnectionDTO;
	/** Схема базы; `null` — та, что названа в реквизитах. */
	schema: string | null;
}

/**
 * Сверяет диаграмму с живой базой и возвращает объединение с пометками.
 *
 * Читается только системный каталог базы — ни одной строки данных. Ничего не
 * меняется ни в базе, ни в документе: это взгляд, а не запись.
 */
export function compareErdWithDbApi({
	docErdId,
	conn,
	schema,
}: CompareErdWithDbParams): Promise<ErdDiff> {
	return invoke("compare_erd_with_db", { docErdId, conn, schema });
}
