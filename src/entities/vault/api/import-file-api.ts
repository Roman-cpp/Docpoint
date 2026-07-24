import { invoke } from "@tauri-apps/api/core";
import type { FileScope } from "@/entities/shared/file-scope";

/** Copy an OS file into `path`, keeping its name; on a name collision a numeric
 *  suffix is appended rather than overwriting. `srcPath` is the absolute path
 *  reported by the drag-drop event. Resolves to the stored file's
 *  scope-relative path. */
export function importFileApi(
	scope: FileScope,
	path: string,
	srcPath: string,
): Promise<string> {
	return invoke("import_file", { scope, path, srcPath });
}
