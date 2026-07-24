import { invoke } from "@tauri-apps/api/core";
import type { FileScope } from "@/entities/shared/file-scope";

/** Create a folder named `name` inside `path`. Resolves to its scope-relative
 *  path, or rejects when something already exists there. */
export function createDirectoryApi(
	scope: FileScope,
	path: string,
	name: string,
): Promise<string> {
	return invoke("create_directory", { scope, path, name });
}
