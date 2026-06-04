import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import { Modal, ModalBtnCancel, ModalBtnDanger } from "@/shared/ui-kit/modal";
import { actionDeleteGroup } from "../../doc-workspace-state";
import { useDocStore } from "../../doc-workspace-state";

interface DeleteGroupModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group: { id: string; label: string };
}

export const DeleteGroupModal: FC<DeleteGroupModalProps> = ({
	open,
	onOpenChange,
	group,
}) => {
	const deleteGroup = useDocStore(actionDeleteGroup);
	const [isDeleting, setIsDeleting] = useState(false);

	const close = () => {
		if (isDeleting) return;
		onOpenChange(false);
	};

	const confirm = async () => {
		setIsDeleting(true);
		try {
			await deleteGroup(group.id);
			onOpenChange(false);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось удалить группу",
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
			title="Удалить группу"
			subtitle="Действие необратимо. Удалить можно только пустую группу."
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
				Удалить группу{" "}
				<strong style={{ fontWeight: 600 }}>{group.label}</strong>?
			</p>
		</Modal>
	);
};
