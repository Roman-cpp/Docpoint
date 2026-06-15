import { type FC, useState } from "react";
import type { Entity, LocalField, UpdateEntityDTO } from "@/entities/entity";
import {
	EntityFieldsEditor,
	serializeFields,
	toLocal,
} from "@/entities/entity";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Modal, ModalBtnCancel, ModalBtnPrimary } from "@/shared/ui-kit/modal";

interface EditEntityModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	entity: Entity;
	onSave: (entity: UpdateEntityDTO) => void;
	isSaving?: boolean;
}

export const EditEntityModal: FC<EditEntityModalProps> = ({
	open,
	onOpenChange,
	entity,
	onSave,
	isSaving = false,
}) => {
	const [name, setName] = useState(entity.name);
	const [desc, setDesc] = useState(entity.desc);
	const [fields, setFields] = useState<LocalField[]>(() =>
		entity.fields.map(toLocal),
	);

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = () => {
		onSave({
			id: entity.id,
			name: name.trim(),
			desc: desc.trim(),
			fields: serializeFields(fields),
		});
	};

	const canSave =
		name.trim().length > 0 &&
		fields.every((f) => f.name.trim().length > 0) &&
		!isSaving;

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Редактировать схему"
			subtitle={`Изменение полей entity «${entity.name}»`}
			width={720}
			actions={
				<>
					<ModalBtnCancel onClick={close} disabled={isSaving}>
						Отмена
					</ModalBtnCancel>
					<ModalBtnPrimary onClick={submit} disabled={!canSave}>
						{isSaving ? "Сохраняем…" : "Сохранить"}
					</ModalBtnPrimary>
				</>
			}
		>
			<Field label="Название" required>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Например, User"
					style={{ width: "100%" }}
				/>
			</Field>
			<Field label="Описание">
				<Textarea
					value={desc}
					onChange={(e) => setDesc(e.target.value)}
					placeholder="Краткое описание схемы"
					rows={2}
					style={{ width: "100%" }}
				/>
			</Field>

			<EntityFieldsEditor fields={fields} onChange={setFields} />
		</Modal>
	);
};
