import { type FC, useState } from "react";
import type { Endpoint } from "@/entities/endpoint";
import { actionDeleteEndpoint, useDocStore } from "@/features/doc-api";
import { Dialog } from "@/shared/ui-kit/modal";

interface DeleteEndpointModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endpoint: Endpoint;
	/** Вызывается после успешного удаления. */
	onDeleted?: () => void;
}

export const DeleteEndpointModal: FC<DeleteEndpointModalProps> = ({
	open,
	onOpenChange,
	endpoint,
	onDeleted,
}) => {
	const deleteEndpoint = useDocStore(actionDeleteEndpoint);
	const [isDeleting, setIsDeleting] = useState(false);

	const close = () => {
		if (isDeleting) return;
		onOpenChange(false);
	};

	const confirm = async () => {
		try {
			setIsDeleting(true);
			await deleteEndpoint(endpoint.id);
			onOpenChange(false);
			onDeleted?.();
		} catch (e) {
			console.error("[DeleteEndpointModal] deleteEndpoint failed:", e);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Header>
				<Dialog.Title>Удалить endpoint</Dialog.Title>
				<Dialog.Subtitle>
					Действие необратимо. Endpoint и все его параметры будут удалены.
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
					Удалить endpoint{" "}
					<strong style={{ fontWeight: 600 }}>
						{endpoint.method} {endpoint.path}
					</strong>
					?
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
