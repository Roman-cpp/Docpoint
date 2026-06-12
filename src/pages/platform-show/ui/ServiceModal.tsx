import { type FC, useEffect, useState } from "react";
import type { CreateServiceDTO } from "@/entities/service";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Modal, ModalBtnCancel, ModalBtnPrimary } from "@/shared/ui-kit/modal";

interface ServiceModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Platform the new microservice will be attached to. */
	platformId: string;
	onCreate: (dto: CreateServiceDTO) => void;
	isSaving?: boolean;
}

export const ServiceModal: FC<ServiceModalProps> = ({
	open,
	onOpenChange,
	platformId,
	onCreate,
	isSaving = false,
}) => {
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");

	// Reset the form each time the modal opens.
	useEffect(() => {
		if (open) {
			setName("");
			setDesc("");
		}
	}, [open]);

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = () => {
		onCreate({
			name: name.trim(),
			desc: desc.trim(),
			platform_id: platformId,
		});
	};

	const canSave = name.trim().length > 0 && !isSaving;

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Новый микросервис"
			subtitle="Добавьте микросервис к этой платформе"
			actions={
				<>
					<ModalBtnCancel onClick={close} disabled={isSaving}>
						Отмена
					</ModalBtnCancel>
					<ModalBtnPrimary onClick={submit} disabled={!canSave} autoFocus>
						{isSaving ? "Сохраняем…" : "Создать"}
					</ModalBtnPrimary>
				</>
			}
		>
			<Field label="Название" required>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Например, auth-service"
					style={{ width: "100%" }}
				/>
			</Field>
			<Field label="Описание">
				<Textarea
					value={desc}
					onChange={(e) => setDesc(e.target.value)}
					placeholder="Краткое описание микросервиса"
					rows={3}
					style={{ width: "100%" }}
				/>
			</Field>
		</Modal>
	);
};
