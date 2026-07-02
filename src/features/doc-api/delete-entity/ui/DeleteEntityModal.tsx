import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import { Dialog } from "@/shared/ui-kit/modal";
import { actionDeleteEntity, useDocApiStore } from "../../doc-workspace-state";

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
	const deleteEntity = useDocApiStore(actionDeleteEntity);
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
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Header>
				<Dialog.Title>Удалить схему</Dialog.Title>
				<Dialog.Subtitle>
					Действие необратимо — поля и enum-значения будут удалены.
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
					Удалить entity{" "}
					<strong style={{ fontWeight: 600 }}>{entity.name}</strong>?
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
