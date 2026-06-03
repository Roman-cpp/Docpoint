import { type FC, useState } from "react";
import type { Endpoint } from "@/entities/endpoint";
import { actionDeleteEndpoint, useDocStore } from "@/features/doc";
import { Modal, ModalBtnCancel, ModalBtnDanger } from "@/shared/ui-kit/modal";

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
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Удалить endpoint"
			subtitle="Действие необратимо. Endpoint и все его параметры будут удалены."
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
				Удалить endpoint{" "}
				<strong style={{ fontWeight: 600 }}>
					{endpoint.method} {endpoint.path}
				</strong>
				?
			</p>
		</Modal>
	);
};
