import type { FileKind } from "./types";

/* ─── Helpers ─── */
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

export const KIND_LABEL: Record<FileKind, string> = {
	doc: "Документ",
	code: "Код",
	archive: "Архив",
	image: "Изображение",
	video: "Видео",
	generic: "Файл",
};
