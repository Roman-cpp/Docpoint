import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import { Dialog } from "@/shared/ui-kit/modal";
import { actionDeleteGroup, useDocApiStore } from "../../doc-workspace-state";

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
	const deleteGroup = useDocApiStore(actionDeleteGroup);
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
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Header>
				<Dialog.Title>Удалить группу</Dialog.Title>
				<Dialog.Subtitle>
					Действие необратимо. Удалить можно только пустую группу.
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
					Удалить группу{" "}
					<strong style={{ fontWeight: 600 }}>{group.label}</strong>?
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
