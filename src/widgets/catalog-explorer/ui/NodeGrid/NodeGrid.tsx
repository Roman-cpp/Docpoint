import type { FC } from "react";
import type { CatalogNode } from "@/entities/catalog";
import {
	formatNodeDate,
	isInSubtree,
	KIND_GROUP_LABEL,
	KIND_ORDER,
} from "@/entities/catalog";
import { cx } from "@/shared/lib/cx";
import { NodeIcon } from "../NodeIcon";
import s from "./NodeGrid.module.css";

interface NodeGridProps {
	/** Прямые потомки открытого каталога, уже отсортированные. */
	nodes: CatalogNode[];
	/** Всё дерево — нужно, чтобы понять, куда можно бросить перетаскиваемый узел. */
	allNodes: CatalogNode[];
	draggingId: string | null;
	dropTargetId: string | null;
	onOpen: (node: CatalogNode) => void;
	onContextMenu: (node: CatalogNode, x: number, y: number) => void;
	onDragStart: (node: CatalogNode) => void;
	onDragEnd: () => void;
	onDragOverCatalog: (id: string | null) => void;
	onDropInto: (parentId: string) => void;
}

/**
 * Содержимое открытого каталога карточками — как окно проводника. Узлы разбиты
 * по видам: сначала каталоги, дальше doc-api, ERD, doc-ws и markdown, каждая
 * группа под своим заголовком. Вид группы назван сверху, поэтому в карточке от
 * него остаётся только иконка.
 *
 * Карточка каталога заодно приёмник перетаскивания: узел кладётся в него без
 * захода внутрь.
 */
export const NodeGrid: FC<NodeGridProps> = ({
	nodes,
	allNodes,
	draggingId,
	dropTargetId,
	onOpen,
	onContextMenu,
	onDragStart,
	onDragEnd,
	onDragOverCatalog,
	onDropInto,
}) => {
	const canDrop = (node: CatalogNode) =>
		node.kind === "catalog" &&
		draggingId !== null &&
		draggingId !== node.id &&
		!isInSubtree(allNodes, draggingId, node.id);

	// Пустые группы не рисуются: заголовок без карточек читался бы как «здесь
	// что-то должно быть».
	const groups = KIND_ORDER.map((kind) => ({
		kind,
		items: nodes.filter((node) => node.kind === kind),
	})).filter((group) => group.items.length > 0);

	return (
		<div className={s.groups}>
			{groups.map((group) => (
				<section key={group.kind} className={s.section}>
					<h2 className={s.sectionTitle}>
						{KIND_GROUP_LABEL[group.kind]}
						<span className={s.sectionCount}>{group.items.length}</span>
					</h2>

					<div className={s.grid}>
						{group.items.map((node) => (
							<button
								key={node.id}
								type="button"
								className={cx(
									s.card,
									draggingId === node.id && s.cardDragging,
									dropTargetId === node.id && s.cardDrop,
								)}
								draggable
								onDragStart={() => onDragStart(node)}
								onDragEnd={onDragEnd}
								onDragOver={(e) => {
									if (!canDrop(node)) return;
									e.preventDefault();
									onDragOverCatalog(node.id);
								}}
								onDragLeave={() => onDragOverCatalog(null)}
								onDrop={(e) => {
									if (!canDrop(node)) return;
									e.preventDefault();
									e.stopPropagation();
									onDropInto(node.id);
								}}
								onDoubleClick={() => onOpen(node)}
								onContextMenu={(e) => {
									e.preventDefault();
									e.stopPropagation();
									onContextMenu(node, e.clientX, e.clientY);
								}}
							>
								<span className={cx(s.tile, s[`tile-${node.kind}`])}>
									<NodeIcon kind={node.kind} size={20} />
								</span>

								<span className={s.name} title={node.desc || node.name}>
									{node.name}
								</span>
								<span className={s.meta}>{formatNodeDate(node.updatedAt)}</span>
							</button>
						))}
					</div>
				</section>
			))}
		</div>
	);
};
