import { invoke } from "@tauri-apps/api/core";

/** Create a new sub-folder inside `parent` (a vault-relative path, empty string
 *  for the root). Resolves to the new folder's vault-relative id, or rejects
 *  when a folder already exists at that path. */
export function createDirectoryApi(
	parent: string,
	name: string,
): Promise<string> {
	return invoke("create_directory", { parent, name });
}
