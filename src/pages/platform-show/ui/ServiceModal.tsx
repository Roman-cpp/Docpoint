import { type FC, useEffect, useState } from "react";
import type {
	CreateServiceDTO,
	Service,
	UpdateServiceDTO,
} from "@/entities/service";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Modal, ModalBtnCancel, ModalBtnPrimary } from "@/shared/ui-kit/modal";

interface ServiceModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Platform the new microservice will be attached to. */
	platformId: string;
	onCreate: (dto: CreateServiceDTO) => void;
	onUpdate: (dto: UpdateServiceDTO) => void;
	/** When set, the modal edits this microservice instead of creating one. */
	service?: Service | null;
	isSaving?: boolean;
}

export const ServiceModal: FC<ServiceModalProps> = ({
	open,
	onOpenChange,
	platformId,
	onCreate,
	onUpdate,
	service = null,
	isSaving = false,
}) => {
	const isEditing = service != null;
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");

	// Reset the form each time the modal opens, seeding it with the edited
	// microservice's values when present.
	useEffect(() => {
		if (open) {
			setName(service?.name ?? "");
			setDesc(service?.desc ?? "");
		}
	}, [open, service]);

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = () => {
		if (isEditing) {
			onUpdate({
				id: service.id,
				name: name.trim(),
				desc: desc.trim(),
				platform_id: service.platform_id,
			});
		} else {
			onCreate({
				name: name.trim(),
				desc: desc.trim(),
				platform_id: platformId,
			});
		}
	};

	const canSave = name.trim().length > 0 && !isSaving;

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title={isEditing ? "Редактировать микросервис" : "Новый микросервис"}
			subtitle={
				isEditing
					? "Измените данные микросервиса"
					: "Добавьте микросервис к этой платформе"
			}
			actions={
				<>
					<ModalBtnCancel onClick={close} disabled={isSaving}>
						Отмена
					</ModalBtnCancel>
					<ModalBtnPrimary onClick={submit} disabled={!canSave} autoFocus>
						{isSaving ? "Сохраняем…" : isEditing ? "Сохранить" : "Создать"}
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
