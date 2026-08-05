import { type FC, useEffect, useState } from "react";
import type {
	CreateDomainDTO,
	Domain,
	UpdateDomainDTO,
} from "@/entities/domain";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

interface DomainModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Platform the new domain will be attached to. */
	platformId: string;
	onCreate: (dto: CreateDomainDTO) => void;
	onUpdate: (dto: UpdateDomainDTO) => void;
	/** When set, the modal edits this domain instead of creating one. */
	domain?: Domain | null;
	isSaving?: boolean;
}

export const DomainModal: FC<DomainModalProps> = ({
	open,
	onOpenChange,
	platformId,
	onCreate,
	onUpdate,
	domain = null,
	isSaving = false,
}) => {
	const isEditing = domain != null;
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");

	// Reset the form each time the modal opens, seeding it with the edited
	// domain's values when present.
	useEffect(() => {
		if (open) {
			setName(domain?.name ?? "");
			setDesc(domain?.desc ?? "");
		}
	}, [open, domain]);

	const handleOpenChange = (next: boolean) => {
		if (isSaving) return;
		onOpenChange(next);
	};

	const close = () => handleOpenChange(false);

	const submit = () => {
		if (isEditing) {
			onUpdate({
				id: domain.id,
				name: name.trim(),
				desc: desc.trim(),
				platformId: domain.platformId,
			});
		} else {
			onCreate({
				name: name.trim(),
				desc: desc.trim(),
				platformId,
			});
		}
	};

	const canSave = name.trim().length > 0 && !isSaving;

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Header>
				<Dialog.Title>
					{isEditing ? "Редактировать домен" : "Новый домен"}
				</Dialog.Title>
				<Dialog.Subtitle>
					{isEditing
						? "Измените данные домена"
						: "Добавьте домен к этой платформе"}
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<Field label="Название" required>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Например, billing"
						style={{ width: "100%" }}
					/>
				</Field>
				<Field label="Описание">
					<Textarea
						value={desc}
						onChange={(e) => setDesc(e.target.value)}
						placeholder="Краткое описание домена"
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
					{isSaving ? "Сохраняем…" : isEditing ? "Сохранить" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
