import type { FC } from "react";
import { usePlatformsStore } from "@/entities/platform";
import { Modal, ModalBtnCancel, ModalBtnDanger } from "@/shared/ui-kit/modal";

interface DeletePlatformModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	platform: { id: string; name: string };
}

export const DeletePlatformModal: FC<DeletePlatformModalProps> = ({
	open,
	onOpenChange,
	platform,
}) => {
	const { deletePlatform, isDeleting } = usePlatformsStore();

	const close = () => {
		if (isDeleting) return;
		onOpenChange(false);
	};

	const confirm = () => {
		deletePlatform(platform.id);
		onOpenChange(false);
	};

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Удалить платформу"
			subtitle="Действие необратимо."
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
				Удалить платформу{" "}
				<strong style={{ fontWeight: 600 }}>{platform.name}</strong>?
			</p>
		</Modal>
	);
};
