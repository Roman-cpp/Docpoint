import type { CatalogNode, NodeKind } from "../model/catalog-node.entity";

/** Страница документа. У каталога своей страницы нет — он открывается в
 *  проводнике, поэтому `null`. */
export const nodeRoute = (
	node: Pick<CatalogNode, "id" | "kind">,
): string | null => {
	const routes: Record<NodeKind, string | null> = {
		catalog: null,
		docApi: `/doc-show/${node.id}`,
		docWs: `/doc-ws-show/${node.id}`,
		docErd: `/doc-erd-show/${node.id}`,
		markdown: `/markdown-show/${node.id}`,
	};

	return routes[node.kind];
};

/** Проводник платформы, открытый на каталоге; без каталога — на корне. */
export const catalogRoute = (
	platformId: string,
	catalogId?: string | null,
): string =>
	catalogId
		? `/platform-show/${platformId}?catalog=${encodeURIComponent(catalogId)}`
		: `/platform-show/${platformId}`;
