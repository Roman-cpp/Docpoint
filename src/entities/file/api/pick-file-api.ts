import { invoke } from "@tauri-apps/api/core";
import type { PickedFile } from "../model/picked-file.type";

/** Системный диалог выбора файла — любого, без фильтров по типу. `null` —
 *  выбор отменили.
 *
 *  Диалог открывает бэкенд: файл забирается в хранилище копированием по пути, а
 *  у `File` из веб-инпута пути нет — содержимое пришлось бы гнать через IPC. */
export function pickFileApi(): Promise<PickedFile | null> {
	return invoke("pick_file");
}
