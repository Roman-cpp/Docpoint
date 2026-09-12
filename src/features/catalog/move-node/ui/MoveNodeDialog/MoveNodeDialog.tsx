import { type FC, useState } from "react";
import {
	buildTree,
	type CatalogNode,
	isInSubtree,
	type TreeNode,
} from "@/entities/catalog";
import { cx } from "@/shared/lib/cx";
import { FolderIcon } from "@/shared/svg";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./MoveNodeDialog.module.css";

interface MoveNodeDialogProps {
	node: CatalogNode;
	/** Все узлы платформы — из них строится список каталогов-приёмников. */
	nodes: CatalogNode[];
	isSaving?: boolean;
	onClose: () => void;
	onMove: (parentId: string | null) => Promise<unknown>;
}

/** Строка списка: каталог с отступом по глубине. */
interface Row {
	node: TreeNode;
	depth: number;
}

/** Только каталоги, сверху вниз — документы приёмниками быть не могут. */
const catalogRows = (nodes: CatalogNode[]): Row[] => {
	const rows: Row[] = [];

	const walk = (list: TreeNode[], depth: number) => {
		for (const child of list) {
			if (child.kind !== "catalog") continue;
			rows.push({ node: child, depth });
			walk(child.children, depth + 1);
		}
	};

	walk(buildTree(nodes), 0);
	return rows;
};

/**
 * Выбор нового каталога для узла. Собственное поддерево и текущий родитель
 * недоступны: первое отцепило бы ветку от дерева, второе ничего бы не изменило.
 */
export const MoveNodeDialog: FC<MoveNodeDialogProps> = ({
	node,
	nodes,
	isSaving = false,
	onClose,
	onMove,
}) => {
	const [target, setTarget] = useState<string | null>(node.parentId);

	const rows = catalogRows(nodes);
	const unchanged = target === node.parentId;

	const submit = async () => {
		if (unchanged || isSaving) return;
		try {
			await onMove(target);
			onClose();
		} catch {
			/* тост показывает мутация */
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !isSaving && onClose()}>
			<Dialog.Header>
				<Dialog.Title>Переместить «{node.name}»</Dialog.Title>
				<Dialog.Subtitle>
					Выберите каталог-приёмник. Вместе с каталогом переедет всё, что
					внутри.
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<div className={s.list}>
					<button
						type="button"
						className={cx(s.row, target === null && s.rowActive)}
						disabled={node.parentId === null}
						onClick={() => setTarget(null)}
					>
						<FolderIcon size={14} />
						<span className={s.name}>Корень платформы</span>
					</button>

					{rows.map(({ node: catalog, depth }) => {
						// Внутрь себя каталог не переносится — вместе со всем поддеревом.
						const forbidden = isInSubtree(nodes, node.id, catalog.id);

						return (
							<button
								key={catalog.id}
								type="button"
								className={cx(s.row, target === catalog.id && s.rowActive)}
								style={{ paddingLeft: 12 + depth * 16 }}
								disabled={forbidden || catalog.id === node.parentId}
								onClick={() => setTarget(catalog.id)}
							>
								<FolderIcon size={14} />
								<span className={s.name}>{catalog.name}</span>
								{catalog.id === node.parentId && (
									<span className={s.hint}>текущий</span>
								)}
							</button>
						);
					})}
				</div>
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={unchanged || isSaving}>
					{isSaving ? "Переносим…" : "Переместить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
