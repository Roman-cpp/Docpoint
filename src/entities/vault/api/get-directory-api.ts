import { invoke } from "@tauri-apps/api/core";
import type { FileScope } from "@/entities/shared/file-scope";
import type { DirListing } from "../model/vault.entity";

/** List the folders and files directly inside `path` (relative to `scope`,
 *  empty string for the scope root). A folder that does not exist yet lists as
 *  empty rather than failing. */
export function getDirectoryApi(
	scope: FileScope,
	path = "",
): Promise<DirListing> {
	return invoke("read_directory", { scope, path });
}
