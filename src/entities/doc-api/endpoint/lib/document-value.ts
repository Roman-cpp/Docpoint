import { parseFieldPath } from "./field-path";

/**
 * Чтение и запись значения по пути внутри JSON-документа.
 *
 * Пути с массивами (`items[].title`) сюда не приходят: какой именно элемент
 * правит поле формы, сказать нельзя, поэтому такие поля правятся только в
 * редакторе JSON. Проверить путь можно через [`isInsideList`].
 */

/** Значение по пути; `undefined`, если такого поля в документе нет. */
export function readAt(document: unknown, path: string): unknown {
	let node = document;
	for (const segment of parseFieldPath(path)) {
		if (node === null || typeof node !== "object" || Array.isArray(node)) {
			return undefined;
		}
		node = (node as Record<string, unknown>)[segment.key];
	}
	return node;
}

/**
 * Записывает значение по пути и возвращает документ новым текстом.
 *
 * Недостающие объекты по дороге создаются: поле, описанное в схеме, можно
 * заполнить, даже если его ветки в теле ещё нет. `undefined` удаляет ключ —
 * так очищается поле формы. Документ, который не разбирается как JSON,
 * возвращается нетронутым: править его вслепую опаснее, чем не править.
 */
export function writeAt(
	document: string,
	path: string,
	value: unknown,
): string {
	const segments = parseFieldPath(path);
	if (segments.length === 0) return document;

	const text = document.trim();
	let root: unknown;
	try {
		root = text === "" ? {} : JSON.parse(text);
	} catch {
		return document;
	}
	if (root === null || typeof root !== "object" || Array.isArray(root)) {
		return document;
	}

	let node = root as Record<string, unknown>;
	for (const segment of segments.slice(0, -1)) {
		const next = node[segment.key];
		if (next === null || typeof next !== "object" || Array.isArray(next)) {
			node[segment.key] = {};
		}
		node = node[segment.key] as Record<string, unknown>;
	}

	const last = segments[segments.length - 1].key;
	if (value === undefined) delete node[last];
	else node[last] = value;

	return Object.keys(root).length === 0 ? "" : JSON.stringify(root, null, 2);
}
