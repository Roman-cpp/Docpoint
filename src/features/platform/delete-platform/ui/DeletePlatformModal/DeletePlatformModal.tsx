import type { FC } from "react";
import { usePlatformsStore } from "@/entities/platform";
import { Dialog } from "@/shared/ui-kit/modal";

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
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Header>
				<Dialog.Title>Удалить платформу</Dialog.Title>
				<Dialog.Subtitle>Действие необратимо.</Dialog.Subtitle>
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
					Удалить платформу{" "}
					<strong style={{ fontWeight: 600 }}>{platform.name}</strong>?
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
