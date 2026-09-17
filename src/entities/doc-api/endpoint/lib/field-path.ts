/**
 * Путь к полю внутри JSON-документа: `title`, `meta.total`, `data[].id`.
 *
 * Скобки означают «элемент массива», а не конкретный индекс: у всех элементов
 * форма одна, и описание у них тоже одно. Нотация та же, что в схемах ответов,
 * — это она и есть, просто теперь путь ведёт по настоящему документу.
 */
export interface PathSegment {
	/** Имя ключа на своём уровне. */
	key: string;
	/** За ключом стоит массив: дальше путь идёт внутрь его элемента. */
	list: boolean;
}

/** Разбирает путь на сегменты. Пустой путь даёт пустой список. */
export function parseFieldPath(path: string): PathSegment[] {
	return path
		.split(".")
		.filter((part) => part !== "")
		.map((part) => ({
			key: part.replace(/(\[\])+$/, ""),
			list: part.endsWith("[]"),
		}));
}

/** Путь ребёнка: `meta` + `total` → `meta.total`. */
export function childPath(parent: string, key: string): string {
	return parent === "" ? key : `${parent}.${key}`;
}

/** Путь элемента массива: `data` → `data[]`. */
export function itemPath(path: string): string {
	return `${path}[]`;
}

/** Путь ведёт внутрь массива — такое поле формой не правится. */
export function isInsideList(path: string): boolean {
	const segments = parseFieldPath(path);
	return segments.slice(0, -1).some((segment) => segment.list);
}
