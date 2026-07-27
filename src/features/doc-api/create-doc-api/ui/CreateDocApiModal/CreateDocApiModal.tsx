import { type FC, useState } from "react";
import type { CreateDocDTO } from "@/entities/doc-api";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

interface CreateDocApiModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (dto: CreateDocDTO) => void;
	isCreating?: boolean;
}

export const CreateDocApiModal: FC<CreateDocApiModalProps> = ({
	open,
	onOpenChange,
	onCreate,
	isCreating = false,
}) => {
	const [name, setName] = useState("");
	const [version, setVersion] = useState("1.0.0");
	const [desc, setDesc] = useState("");
	const [prefix, setPrefix] = useState("");
	const [tagsInput, setTagsInput] = useState("");

	const reset = () => {
		setName("");
		setVersion("1.0.0");
		setDesc("");
		setPrefix("");
		setTagsInput("");
	};

	const handleOpenChange = (next: boolean) => {
		if (isCreating) return;
		if (!next) reset();
		onOpenChange(next);
	};

	const close = () => {
		handleOpenChange(false);
	};

	const submit = () => {
		const tags = tagsInput
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
		onCreate({
			name: name.trim(),
			version: version.trim() || "1.0.0",
			desc: desc.trim(),
			prefix: prefix.trim(),
			tags,
		});
		reset();
	};

	const canCreate = name.trim().length > 0 && !isCreating;

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Header>
				<Dialog.Title>Новый документ</Dialog.Title>
				<Dialog.Subtitle>
					Создайте документ, чтобы добавлять в него endpoints
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
				<Dialog.BtnCancel onClick={close} disabled={isCreating}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={submit} disabled={!canCreate} autoFocus>
					{isCreating ? "Создаём…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
