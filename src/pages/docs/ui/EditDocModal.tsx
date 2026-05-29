import { type FC, useState } from "react";
import type { Doc, UpdateDocDTO } from "@/entities/doc";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Modal, ModalBtnCancel, ModalBtnPrimary } from "@/shared/ui-kit/modal";

interface EditDocModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	doc: Doc;
	onSave: (updates: UpdateDocDTO) => void;
	isSaving?: boolean;
}

export const EditDocModal: FC<EditDocModalProps> = ({
	open,
	onOpenChange,
	doc,
	onSave,
	isSaving = false,
}) => {
	const [name, setName] = useState(doc.name);
	const [desc, setDesc] = useState(doc.desc);
	const [tagsInput, setTagsInput] = useState(doc.tags.join(", "));

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const submit = () => {
		const tags = tagsInput
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
		onSave({ name: name.trim(), desc: desc.trim(), tags, id: doc.id });
	};

	const canSave = name.trim().length > 0 && !isSaving;

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Редактировать документ"
			subtitle="Изменения применятся ко всем endpoints этого документа"
			actions={
				<>
					<ModalBtnCancel onClick={close} disabled={isSaving}>
						Отмена
					</ModalBtnCancel>
					<ModalBtnPrimary onClick={submit} disabled={!canSave} autoFocus>
						{isSaving ? "Сохраняем…" : "Сохранить"}
					</ModalBtnPrimary>
				</>
			}
		>
			<Field label="Название" required>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Например, Payments API"
					style={{ width: "100%" }}
				/>
			</Field>
			<Field label="Описание">
				<Textarea
					value={desc}
					onChange={(e) => setDesc(e.target.value)}
					placeholder="Краткое описание документа"
					rows={3}
					style={{ width: "100%" }}
				/>
			</Field>
			<Field label="Теги" hint="Список через запятую">
				<Input
					value={tagsInput}
					onChange={(e) => setTagsInput(e.target.value)}
					placeholder="payments, v1, internal"
					style={{ width: "100%", fontFamily: "var(--font-mono)" }}
				/>
			</Field>
		</Modal>
	);
};
