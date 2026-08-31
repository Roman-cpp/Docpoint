import { invoke } from "@tauri-apps/api/core";

/** Системный диалог выбора файла SQLite; `null` — выбор отменили. */
export function pickDbFileApi(): Promise<string | null> {
	return invoke("pick_db_file");
}
