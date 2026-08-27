import type { CatalogNode } from "../model/catalog-node.entity";

/** Узел вместе с потомками — форма, в которой дерево рисуется. */
export interface TreeNode extends CatalogNode {
	children: TreeNode[];
}

/**
 * Порядок как в проводнике: сначала каталоги, потом документы, внутри группы —
 * по имени. Сравнение локальное: имена в основном русские.
 */
export const compareNodes = (a: CatalogNode, b: CatalogNode): number => {
	if (a.kind !== b.kind) {
		if (a.kind === "catalog") return -1;
		if (b.kind === "catalog") return 1;
	}
	return a.name.localeCompare(b.name, "ru");
};

/** Прямые потомки каталога; `null` — корень платформы. */
export const childrenOf = (
	nodes: CatalogNode[],
	parentId: string | null,
): CatalogNode[] =>
	nodes.filter((node) => node.parentId === parentId).sort(compareNodes);

/** Плоский список в дерево. Узлы с потерянным родителем всплывают в корень —
 *  иначе ветка просто исчезла бы из проводника. */
export const buildTree = (nodes: CatalogNode[]): TreeNode[] => {
	const byId = new Map<string, TreeNode>(
		nodes.map((node) => [node.id, { ...node, children: [] }]),
	);
	const roots: TreeNode[] = [];

	for (const node of byId.values()) {
		const parent = node.parentId ? byId.get(node.parentId) : undefined;
		if (parent) parent.children.push(node);
		else roots.push(node);
	}

	const sort = (list: TreeNode[]): TreeNode[] => {
		list.sort(compareNodes);
		for (const node of list) sort(node.children);
		return list;
	};

	return sort(roots);
};

/** Цепочка от корня платформы до узла, сам узел последним. */
export const nodePath = (
	nodes: CatalogNode[],
	id: string | null,
): CatalogNode[] => {
	const byId = new Map(nodes.map((node) => [node.id, node]));
	const chain: CatalogNode[] = [];

	let current = id ? byId.get(id) : undefined;
	while (current) {
		chain.unshift(current);
		current = current.parentId ? byId.get(current.parentId) : undefined;
	}

	return chain;
};

/** Лежит ли `id` внутри поддерева `ancestorId` (сам узел считается лежащим в
 *  себе). Нужно диалогу переноса: внутрь себя каталог не переносится. */
export const isInSubtree = (
	nodes: CatalogNode[],
	ancestorId: string,
	id: string | null,
): boolean => nodePath(nodes, id).some((node) => node.id === ancestorId);
