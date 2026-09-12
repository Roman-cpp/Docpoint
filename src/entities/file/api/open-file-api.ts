import { invoke } from "@tauri-apps/api/core";

/** Открыть загруженный файл программой, которой этот тип файлов открывается в
 *  системе. */
export function openFileApi(id: string): Promise<void> {
	return invoke("open_file_node", { id });
}
