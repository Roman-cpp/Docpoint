import { type FC, useEffect, useState } from "react";
import type {
	CreatePlatformDTO,
	Platform,
	UpdatePlatformDTO,
} from "@/entities/platform";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

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
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Header>
				<Dialog.Title>
					{isEdit ? "Редактировать платформу" : "Новая платформа"}
				</Dialog.Title>
				<Dialog.Subtitle>
					{isEdit
						? "Изменения применятся ко всем связанным сущностям"
						: "Добавьте платформу для группировки документов"}
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
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
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={!canSave} autoFocus>
					{isSaving ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
