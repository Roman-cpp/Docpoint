import { invoke } from "@tauri-apps/api/core";

/** Delete a folder and everything inside it, by its vault-relative id. */
export function deleteDirectoryApi(id: string): Promise<void> {
	return invoke("delete_directory", { id });
}
