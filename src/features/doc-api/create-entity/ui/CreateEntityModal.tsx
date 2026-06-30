import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import type { LocalField } from "@/entities/entity";
import { EntityFieldsEditor, serializeFields } from "@/entities/entity";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import { actionAddEntity, useDocStore } from "../../doc-workspace-state";

interface CreateEntityModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const CreateEntityModal: FC<CreateEntityModalProps> = ({
	open,
	onOpenChange,
}) => {
	const addEntity = useDocStore(actionAddEntity);

	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");
	const [fields, setFields] = useState<LocalField[]>([]);
	const [isCreating, setIsCreating] = useState(false);

	const reset = () => {
		setName("");
		setDesc("");
		setFields([]);
	};

	const handleOpenChange = (next: boolean) => {
		if (isCreating) return;
		if (!next) reset();
		onOpenChange(next);
	};

	const close = () => handleOpenChange(false);

	const submit = async () => {
		setIsCreating(true);
		try {
			await addEntity({
				name: name.trim(),
				desc: desc.trim(),
				fields: serializeFields(fields),
			});
			reset();
			onOpenChange(false);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось создать схему",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setIsCreating(false);
		}
	};

	const canCreate =
		name.trim().length > 0 &&
		fields.every((f) => f.name.trim().length > 0) &&
		!isCreating;

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange} width={720}>
			<Dialog.Header>
				<Dialog.Title>Новая схема</Dialog.Title>
				<Dialog.Subtitle>Создайте entity и опишите её поля</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
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
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isCreating}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={!canCreate}>
					{isCreating ? "Создаём…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
