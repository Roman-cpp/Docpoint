/**
 * Scope-relative paths are `/`-separated, with `""` meaning the scope root.
 * These helpers are the only place that assembles them on the frontend.
 */

/** Path of `name` inside `folder`. */
export const joinPath = (folder: string, name: string): string =>
	folder ? `${folder}/${name}` : name;

/** Folder containing `path`, `""` when it sits at the scope root. */
export const parentPath = (path: string): string => {
	const slash = path.lastIndexOf("/");
	return slash === -1 ? "" : path.slice(0, slash);
};

/** Breadcrumb chain from the scope root down to `path`, root included. */
export const pathCrumbs = (
	path: string,
	rootLabel: string,
): { name: string; path: string }[] => {
	const chain = [{ name: rootLabel, path: "" }];
	let prefix = "";
	for (const segment of path.split("/").filter(Boolean)) {
		prefix = joinPath(prefix, segment);
		chain.push({ name: segment, path: prefix });
	}
	return chain;
};

/** 129024 → "126 КБ" (binary, ru locale). */
export function formatSize(bytes: number): string {
	const units = ["Б", "КБ", "МБ", "ГБ"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const rounded =
		value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
	return `${rounded.toLocaleString("ru-RU")} ${units[unit]}`;
}
