import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import { Modal, ModalBtnCancel, ModalBtnDanger } from "@/shared/ui-kit/modal";
import { actionDeleteEntity, useDocStore } from "../../doc-workspace-state";

interface DeleteEntityModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	entity: { id: string; name: string };
}

export const DeleteEntityModal: FC<DeleteEntityModalProps> = ({
	open,
	onOpenChange,
	entity,
}) => {
	const deleteEntity = useDocStore(actionDeleteEntity);
	const [isDeleting, setIsDeleting] = useState(false);

	const close = () => {
		if (isDeleting) return;
		onOpenChange(false);
	};

	const confirm = async () => {
		setIsDeleting(true);
		try {
			await deleteEntity(entity.id);
			onOpenChange(false);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось удалить схему",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Удалить схему"
			subtitle="Действие необратимо — поля и enum-значения будут удалены."
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
				Удалить entity{" "}
				<strong style={{ fontWeight: 600 }}>{entity.name}</strong>?
			</p>
		</Modal>
	);
};
