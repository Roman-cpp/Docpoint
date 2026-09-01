import type { CatalogNode, NodeKind } from "../model/catalog-node.entity";

/** Страница документа. `null` — своей страницы нет: каталог открывается в
 *  проводнике, а загруженный файл — установленной в системе программой. */
export const nodeRoute = (
	node: Pick<CatalogNode, "id" | "kind">,
): string | null => {
	const routes: Record<NodeKind, string | null> = {
		catalog: null,
		docApi: `/doc-show/${node.id}`,
		docWs: `/doc-ws-show/${node.id}`,
		docErd: `/doc-erd-show/${node.id}`,
		markdown: `/markdown-show/${node.id}`,
		file: null,
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
