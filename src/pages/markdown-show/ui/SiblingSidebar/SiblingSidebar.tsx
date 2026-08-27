import type { FC } from "react";
import { Link } from "react-router";
import type { CatalogNode } from "@/entities/catalog";
import {
	catalogRoute,
	childrenOf,
	nodePath,
	nodeRoute,
} from "@/entities/catalog";
import { cx } from "@/shared/lib/cx";
import { ChevronLeftIcon, FileIcon } from "@/shared/svg";
import s from "../MarkdownShowPage.module.css";

interface SiblingSidebarProps {
	/** Все узлы платформы — из них берутся соседи открытого документа. */
	nodes: CatalogNode[];
	/** Документ на экране. */
	node: CatalogNode;
}

/**
 * Соседи по каталогу — те же markdown-документы, что лежат рядом. Прочие виды
 * узлов сюда не попадают: у них свои страницы, а этот список нужен, чтобы
 * листать заметки не выходя из читалки.
 */
export const SiblingSidebar: FC<SiblingSidebarProps> = ({ nodes, node }) => {
	const siblings = childrenOf(nodes, node.parentId).filter(
		(sibling) => sibling.kind === "markdown",
	);
	const path = nodePath(nodes, node.parentId);
	const parent = path[path.length - 1];

	return (
		<aside className={s.sidebar}>
			<Link
				className={s.sideBack}
				to={catalogRoute(node.platformId, node.parentId)}
			>
				<ChevronLeftIcon size={11} />
				{parent?.name ?? "Все документы"}
			</Link>

			<div className={s.sideList}>
				{siblings.map((sibling) => (
					<Link
						key={sibling.id}
						to={nodeRoute(sibling) ?? ""}
						className={cx(s.sideRow, sibling.id === node.id && s.sideRowActive)}
					>
						<FileIcon size={13} />
						<span className={s.sideRowName}>{sibling.name}</span>
					</Link>
				))}
			</div>
		</aside>
	);
};
