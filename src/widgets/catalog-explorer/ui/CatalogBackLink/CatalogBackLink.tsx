import type { FC } from "react";
import { Link } from "react-router";
import { catalogRoute, useCatalogNode } from "@/entities/catalog";

interface CatalogBackLinkProps {
	/** Документ, из которого возвращаемся. */
	nodeId: string;
	className?: string;
}

/**
 * Возврат из документа в каталог, где он лежит. Место берётся из самого узла, а
 * не из состояния перехода: страница документа открывается и по прямой ссылке,
 * и в отдельном окне — там никакого состояния нет.
 */
export const CatalogBackLink: FC<CatalogBackLinkProps> = ({
	nodeId,
	className,
}) => {
	const { node } = useCatalogNode(nodeId);
	const { node: parent } = useCatalogNode(node?.parentId ?? "");

	if (!node) return null;

	return (
		<Link
			className={className}
			to={catalogRoute(node.platformId, node.parentId)}
		>
			← {parent?.name ?? "Все документы"}
		</Link>
	);
};
