import { type FileScope, scopeKey } from "@/entities/shared/file-scope";

/** URL of the markdown viewer for a file. A scope-relative path means nothing
 *  on its own, so the scope travels with it. */
export const markdownRoute = (scope: FileScope, path: string): string =>
	`/markdown-show?scope=${encodeURIComponent(scopeKey(scope))}&file=${encodeURIComponent(path)}`;
