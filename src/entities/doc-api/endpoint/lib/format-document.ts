/**
 * Документ для показа человеку: с отступами, если это JSON, и как есть, если
 * нет. Тело не обязано быть JSON — бывает форма, XML, текст, — и подать его
 * всё равно надо.
 */
export function formatDocument(document: string): string {
	const text = document.trim();
	if (text === "") return "";

	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return document;
	}
}

/** Документ разбирается как JSON: от этого зависит, доступно ли дерево полей. */
export function isJsonDocument(document: string): boolean {
	const text = document.trim();
	if (text === "") return false;

	try {
		JSON.parse(text);
		return true;
	} catch {
		return false;
	}
}
