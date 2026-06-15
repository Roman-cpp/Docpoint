import { type FC, useEffect, useState } from "react";
import type {
	CreatePlatformDTO,
	Platform,
	UpdatePlatformDTO,
} from "@/entities/platform";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Modal, ModalBtnCancel, ModalBtnPrimary } from "@/shared/ui-kit/modal";

interface PlatformModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** When provided — edit mode, otherwise create mode. */
	platform?: Platform | null;
	onCreate?: (dto: CreatePlatformDTO) => void;
	onUpdate?: (dto: UpdatePlatformDTO) => void;
	isSaving?: boolean;
}

export const PlatformModal: FC<PlatformModalProps> = ({
	open,
	onOpenChange,
	platform,
	onCreate,
	onUpdate,
	isSaving = false,
}) => {
	const isEdit = Boolean(platform);
	const [name, setName] = useState(platform?.name ?? "");
	const [desc, setDesc] = useState(platform?.desc ?? "");

	// Resync local state whenever the modal opens for a (different) platform.
	useEffect(() => {
		if (open) {
			setName(platform?.name ?? "");
			setDesc(platform?.desc ?? "");
		}
	}, [open, platform]);

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = () => {
		const payload = { name: name.trim(), desc: desc.trim() };
		if (isEdit && platform) {
			onUpdate?.({ ...payload, id: platform.id });
		} else {
			onCreate?.(payload);
		}
	};

	const canSave = name.trim().length > 0 && !isSaving;

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title={isEdit ? "Редактировать платформу" : "Новая платформа"}
			subtitle={
				isEdit
					? "Изменения применятся ко всем связанным сущностям"
					: "Добавьте платформу для группировки документов"
			}
			actions={
				<>
					<ModalBtnCancel onClick={close} disabled={isSaving}>
						Отмена
					</ModalBtnCancel>
					<ModalBtnPrimary onClick={submit} disabled={!canSave} autoFocus>
						{isSaving ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать"}
					</ModalBtnPrimary>
				</>
			}
		>
			<Field label="Название" required>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Например, iOS"
					style={{ width: "100%" }}
				/>
			</Field>
			<Field label="Описание">
				<Textarea
					value={desc}
					onChange={(e) => setDesc(e.target.value)}
					placeholder="Краткое описание платформы"
					rows={3}
					style={{ width: "100%" }}
				/>
			</Field>
		</Modal>
	);
};
