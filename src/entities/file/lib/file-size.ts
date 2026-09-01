const UNITS = ["Б", "КБ", "МБ", "ГБ", "ТБ"];

/**
 * Размер файла человеку: `4096` → «4 КБ». Десятая доля показывается только там,
 * где она что-то значит — у байтов и у крупных чисел она лишний шум.
 */
export const formatFileSize = (bytes: number): string => {
	if (!Number.isFinite(bytes) || bytes < 0) return "";

	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit += 1;
	}

	const digits = unit === 0 || value >= 100 ? 0 : 1;
	return `${value.toFixed(digits).replace(".", ",")} ${UNITS[unit]}`;
};
