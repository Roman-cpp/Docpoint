/**
 * Имя файла из пути: `/home/u/Загрузки/Смета.xlsx` → «Смета.xlsx». Разделитель
 * любой — пути приходят от системы, а Windows отдаёт их с обратной косой.
 */
export const fileNameFromPath = (path: string): string => {
	const trimmed = path.replace(/[\\/]+$/, "");
	const idx = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
	return idx === -1 ? trimmed : trimmed.slice(idx + 1);
};
