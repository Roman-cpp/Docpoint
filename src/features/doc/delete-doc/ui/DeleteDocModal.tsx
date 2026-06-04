import type { FC } from "react";
import { Modal, ModalBtnCancel, ModalBtnDanger } from "@/shared/ui-kit/modal";
import { useDocsStore } from "../../../../entities/doc/store/useDocsStore";

interface DeleteDocModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	doc: { id: string; name: string };
}

export const DeleteDocModal: FC<DeleteDocModalProps> = ({
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
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Удалить документ"
			subtitle="Действие необратимо. Документ и все его endpoints будут удалены."
			actions={
				<>
					<ModalBtnCancel onClick={close} disabled={isDeleting}>
						Отмена
					</ModalBtnCancel>
					<ModalBtnDanger onClick={confirm} disabled={isDeleting} autoFocus>
						{isDeleting ? "Удаляем…" : "Удалить"}
					</ModalBtnDanger>
				</>
			}
		>
			<p
				style={{
					margin: 0,
					fontSize: 13,
					color: "var(--ink)",
					lineHeight: "var(--lh-snug)",
				}}
			>
				Удалить документ <strong style={{ fontWeight: 600 }}>{doc.name}</strong>
				?
			</p>
		</Modal>
	);
};
