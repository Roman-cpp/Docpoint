/** Текст ошибки разбора JSON или `null`, если строка валидна. Пустая — валидна. */
export function getJsonError(raw: string): string | null {
	if (!raw.trim()) return null;
	try {
		JSON.parse(raw);
		return null;
	} catch (e) {
		return e instanceof Error ? e.message : "Некорректный JSON";
	}
}

/** Форматирует JSON в 2 пробела; невалидную строку возвращает как есть. */
export function formatJson(raw: string): string {
	try {
		return JSON.stringify(JSON.parse(raw), null, 2);
	} catch {
		return raw;
	}
}
