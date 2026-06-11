import { invoke } from "@tauri-apps/api/core";
import type { File } from "../file";
import type { Folder } from "../folder";

/** Direct contents of a single folder, as returned by `read_directory`. */
export interface DirListing {
	folders: Folder[];
	files: File[];
}

/** List the sub-folders and files directly inside a vault folder.
 *  Pass an empty string (the default) to list the vault root. */
export function readDirectoryApi(folder = ""): Promise<DirListing> {
	return invoke("read_directory", { folder });
}
