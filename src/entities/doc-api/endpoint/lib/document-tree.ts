import type { FieldNote } from "../model/endpoint.type";
import { childPath, itemPath } from "./field-path";

/** Узел документа: одно поле со всем, что о нём известно. */
export interface DocumentNode {
	/** Путь к полю: `title`, `meta.total`, `data[].id`. */
	path: string;
	/** Имя ключа на своём уровне. */
	key: string;
	/** Значение — массив: дети описывают форму его элемента. */
	list: boolean;
	/** Тип из самого документа: `string`, `number`, `object`, … */
	type: string;
	/** Уточнение из примечания — то, чего JSON не различает. Может быть пустым. */
	format: string;
	required: boolean;
	desc: string;
	/** Значение из документа, если это лист: `"done"`, `20`, `null`. */
	sample: string;
	children: DocumentNode[];
}

export interface DocumentTree {
	nodes: DocumentNode[];
	/** Документ не разбирается как JSON — дерева нет, остаётся показать текст. */
	invalid: boolean;
	/**
	 * Примечания, чьих путей в документе нет. Это не ошибка: необязательное
	 * поле описывают, а в пример не кладут — пусть будет видно, что оно есть.
	 */
	orphans: FieldNote[];
}

const EMPTY_NOTE = { format: "", required: false, desc: "" };

/** Тип значения так, как его называет сам JSON. */
function typeOf(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	return typeof value;
}

/** Значение листа одной строкой — то, что показывается рядом с описанием. */
function sampleOf(value: unknown): string {
	if (typeof value === "string") return value;
	if (value === undefined) return "";
	return JSON.stringify(value);
}

/**
 * Дерево полей документа с прицепленными примечаниями.
 *
 * Форму и типы задаёт сам документ, примечания добавляют то, чего в нём не
 * видно: описание, обязательность и уточнение типа. Массив описывается по
 * своему первому элементу — у всех элементов форма одна, и путь внутрь
 * получает скобки (`data[].id`).
 */
export function buildDocumentTree(
	document: string,
	notes: FieldNote[],
): DocumentTree {
	const byPath = new Map(notes.map((note) => [note.path, note]));
	const used = new Set<string>();

	const text = document.trim();
	if (text === "") {
		return { nodes: [], invalid: false, orphans: notes };
	}

	let root: unknown;
	try {
		root = JSON.parse(text);
	} catch {
		return { nodes: [], invalid: true, orphans: notes };
	}

	const node = (path: string, key: string, value: unknown): DocumentNode => {
		const note = byPath.get(path) ?? EMPTY_NOTE;
		used.add(path);

		const list = Array.isArray(value);
		const item = list ? (value as unknown[])[0] : undefined;
		// У массива дети берутся из первого элемента: это образец формы, а не
		// конкретная строка данных.
		const source = list ? item : value;
		const prefix = list ? itemPath(path) : path;

		return {
			path,
			key,
			list,
			type: typeOf(value),
			format: note.format,
			required: note.required,
			desc: note.desc,
			sample: list || typeOf(source) === "object" ? "" : sampleOf(value),
			children: children(prefix, source),
		};
	};

	const children = (prefix: string, value: unknown): DocumentNode[] => {
		if (value === null || typeof value !== "object" || Array.isArray(value)) {
			return [];
		}
		return Object.entries(value as Record<string, unknown>).map(
			([key, child]) => node(childPath(prefix, key), key, child),
		);
	};

	// Массив в корне описывается по своему элементу, и путь начинается со
	// скобок: `[].symbol`. Скаляр в корне полей не имеет вовсе.
	const nodes = Array.isArray(root)
		? children("[]", (root as unknown[])[0])
		: root !== null && typeof root === "object"
			? children("", root)
			: [];

	return {
		nodes,
		invalid: false,
		orphans: notes.filter((note) => !used.has(note.path)),
	};
}

/** Сколько всего полей в дереве — для счётчика у заголовка. */
export function countDocumentNodes(nodes: DocumentNode[]): number {
	return nodes.reduce(
		(sum, node) => sum + 1 + countDocumentNodes(node.children),
		0,
	);
}
