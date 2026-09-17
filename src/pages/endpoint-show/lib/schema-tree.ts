import type { ResponseField } from "@/entities/doc-api";

/**
 * Узел схемы ответа. Плоский список полей описывает вложенность точками и
 * скобками (`meta.total`, `data[].id`) — дерево разворачивает её обратно,
 * чтобы документация показывала форму тела, а не перечень путей.
 */
export interface SchemaNode {
	/** Имя ключа на своём уровне, без скобок: `data[]` → `data`. */
	key: string;
	/** Полный путь от корня — он же ключ в исходном списке полей. */
	path: string;
	/** Ключ описан как массив (`data[]`) — рядом с именем рисуется `[]`. */
	list: boolean;
	type: string;
	desc: string;
	example?: string;
	/** Узел появился только как родитель описанного поля, своей строки в
	 *  документации у него нет — тип и описание домыслены. */
	implied: boolean;
	children: SchemaNode[];
}

/** Промежуточный узел, которого автор не описывал: тип берём по скобкам. */
const impliedNode = (key: string, path: string, list: boolean): SchemaNode => ({
	key,
	path,
	list,
	type: list ? "array" : "object",
	desc: "",
	implied: true,
	children: [],
});

/**
 * Собирает дерево из плоского списка полей. Порядок полей сохраняется: узел
 * встаёт туда, где впервые встретился его путь.
 *
 * Поля с одинаковым ключом схлопываются в один узел — побеждает последнее
 * описание, как и при отрисовке плоским списком.
 */
export function buildSchemaTree(fields: ResponseField[]): SchemaNode[] {
	const roots: SchemaNode[] = [];
	const byPath = new Map<string, SchemaNode>();

	for (const field of fields) {
		const segments = field.key.split(".").filter((segment) => segment !== "");
		if (segments.length === 0) continue;

		let path = "";
		let level = roots;
		let node: SchemaNode | undefined;

		for (const segment of segments) {
			path = path === "" ? segment : `${path}.${segment}`;
			const known = byPath.get(path);
			if (known) {
				node = known;
			} else {
				node = impliedNode(
					segment.replace(/(\[\])+$/, ""),
					path,
					segment.endsWith("[]"),
				);
				byPath.set(path, node);
				level.push(node);
			}
			level = node.children;
		}

		if (!node) continue;
		node.type = field.type;
		node.desc = field.desc;
		node.example = field.example;
		node.implied = false;
	}

	return roots;
}

/** Сколько всего полей в дереве — для счётчика у заголовка секции. */
export function countSchemaNodes(nodes: SchemaNode[]): number {
	return nodes.reduce(
		(sum, node) => sum + 1 + countSchemaNodes(node.children),
		0,
	);
}
