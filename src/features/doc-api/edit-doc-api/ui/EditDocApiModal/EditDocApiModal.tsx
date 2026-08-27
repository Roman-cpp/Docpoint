import { type FC, useState } from "react";
import type { Doc, UpdateDocDTO } from "@/entities/doc-api";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

interface EditDocApiModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	doc: Doc;
	onSave: (updates: UpdateDocDTO) => void;
	isSaving?: boolean;
}

export const EditDocApiModal: FC<EditDocApiModalProps> = ({
	open,
	onOpenChange,
	doc,
	onSave,
	isSaving = false,
}) => {
	const [name, setName] = useState(doc.name);
	const [desc, setDesc] = useState(doc.desc);
	const [version, setVersion] = useState(doc.version);
	const [prefix, setPrefix] = useState(doc.prefix);
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
		onSave({
			name: name.trim(),
			desc: desc.trim(),
			version: version.trim(),
			prefix: prefix.trim(),
			tags,
			id: doc.id,
		});
	};

	const canSave = name.trim().length > 0 && !isSaving;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Header>
				<Dialog.Title>Редактировать документ</Dialog.Title>
				<Dialog.Subtitle>
					Изменения применятся ко всем endpoints этого документа
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<Field label="Название" required>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Например, Payments API"
						style={{ width: "100%" }}
					/>
				</Field>
				<Field label="Версия">
					<Input
						value={version}
						onChange={(e) => setVersion(e.target.value)}
						placeholder="1.0.0"
						style={{ width: "100%", fontFamily: "var(--font-mono)" }}
					/>
				</Field>
				<Field
					label="Префикс"
					hint="дописывается после префикса окружения ко всем путям документа"
				>
					<Input
						value={prefix}
						onChange={(e) => setPrefix(e.target.value)}
						placeholder="/payments"
						style={{ width: "100%", fontFamily: "var(--font-mono)" }}
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
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={!canSave} autoFocus>
					{isSaving ? "Сохраняем…" : "Сохранить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
