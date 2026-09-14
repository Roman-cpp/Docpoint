import { type FC, useState } from "react";
import type { CatalogNode } from "@/entities/catalog";
import { Dialog } from "@/shared/ui-kit/modal";

interface DeleteNodeDialogProps {
	node: CatalogNode;
	/** Сколько узлов лежит внутри — каталог уносит их с собой. */
	childrenCount: number;
	onClose: () => void;
	onDelete: () => Promise<unknown>;
}

/** Подтверждение удаления. Для каталога честно называет число узлов внутри:
 *  каскад унесёт их вместе с ним. */
export const DeleteNodeDialog: FC<DeleteNodeDialogProps> = ({
	node,
	childrenCount,
	onClose,
	onDelete,
}) => {
	const [deleting, setDeleting] = useState(false);

	const confirm = async () => {
		if (deleting) return;
		setDeleting(true);
		try {
			await onDelete();
			onClose();
		} catch {
			/* тост показывает мутация */
		} finally {
			setDeleting(false);
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !deleting && onClose()}>
			<Dialog.Header>
				<Dialog.Title>
					{node.kind === "catalog" ? "Удалить каталог?" : "Удалить документ?"}
				</Dialog.Title>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
					«{node.name}» будет удалён без возможности восстановления.
					{childrenCount > 0 &&
						` Вместе с ним удалится всё, что внутри: ${childrenCount} шт.`}
				</p>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={deleting}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnDanger onClick={confirm} disabled={deleting}>
					{deleting ? "Удаляем…" : "Удалить"}
				</Dialog.BtnDanger>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
