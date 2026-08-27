/** Вид узла дерева. `catalog` — папка, остальные виды — документы. */
export type NodeKind = "catalog" | "docApi" | "docWs" | "docErd" | "markdown";

/**
 * Узел дерева платформы. У документа id узла — это и есть id документа, так что
 * ссылка на страницу собирается прямо отсюда.
 */
export interface CatalogNode {
	id: string;
	platformId: string;
	/** `null` — узел лежит в корне платформы. */
	parentId: string | null;
	kind: NodeKind;
	name: string;
	desc: string;
	/** Время создания и изменения, `YYYY-MM-DD HH:MM:SS` в UTC. */
	createdAt: string;
	updatedAt: string;
}

/** Может ли узел содержать другие узлы. Документы — листья дерева. */
export const isCatalog = (node: CatalogNode): boolean =>
	node.kind === "catalog";
