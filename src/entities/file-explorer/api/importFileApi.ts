import { invoke } from "@tauri-apps/api/core";

/** Copy an OS file (dragged into the app) into the vault under `folder`
 *  (a vault-relative path, empty string for the root). `srcPath` is the
 *  absolute path reported by the drag-drop event. Resolves to the stored
 *  file's vault-relative id. */
export function importFileApi(srcPath: string, folder: string): Promise<string> {
	return invoke("import_file", { srcPath, folder });
}
