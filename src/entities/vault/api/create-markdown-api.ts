import { invoke } from "@tauri-apps/api/core";
import type { FileScope } from "@/entities/shared/file-scope";

/** Create `<path>/<name>` with an initial body. Resolves to its scope-relative
 *  path, or rejects when the file already exists. */
export function createMarkdownApi(
	scope: FileScope,
	path: string,
	name: string,
	content: string,
): Promise<string> {
	return invoke("create_markdown", { scope, path, name, content });
}
