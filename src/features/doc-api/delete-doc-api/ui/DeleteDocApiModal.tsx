import type { FC } from "react";
import { Dialog } from "@/shared/ui-kit/modal";
import { useDocsStore } from "../../../../entities/doc-api/store/useDocApisStore";

interface DeleteDocApiModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	doc: { id: string; name: string };
}

export const DeleteDocApiModal: FC<DeleteDocApiModalProps> = ({
	open,
	onOpenChange,
	doc,
}) => {
	const { deleteDoc, isDeleting } = useDocsStore();

	const close = () => {
		if (isDeleting) return;
		onOpenChange(false);
	};

	const confirm = () => {
		deleteDoc(doc.id);
		onOpenChange(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Header>
				<Dialog.Title>Удалить документ</Dialog.Title>
				<Dialog.Subtitle>
					Действие необратимо. Документ и все его endpoints будут удалены.
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<p
					style={{
						margin: 0,
						fontSize: 13,
						color: "var(--ink)",
						lineHeight: "var(--lh-snug)",
					}}
				>
					Удалить документ{" "}
					<strong style={{ fontWeight: 600 }}>{doc.name}</strong>?
				</p>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isDeleting}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnDanger onClick={confirm} disabled={isDeleting} autoFocus>
					{isDeleting ? "Удаляем…" : "Удалить"}
				</Dialog.BtnDanger>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
