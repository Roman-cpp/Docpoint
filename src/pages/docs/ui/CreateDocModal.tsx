import { type FC, useState } from "react";
import type { CreateDocDTO } from "@/entities/doc";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Modal, ModalBtnCancel, ModalBtnPrimary } from "@/shared/ui-kit/modal";

interface CreateDocModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (dto: CreateDocDTO) => void;
	isCreating?: boolean;
}

export const CreateDocModal: FC<CreateDocModalProps> = ({
	open,
	onOpenChange,
	onCreate,
	isCreating = false,
}) => {
	const [name, setName] = useState("");
	const [version, setVersion] = useState("1.0.0");
	const [desc, setDesc] = useState("");
	const [tagsInput, setTagsInput] = useState("");

	const reset = () => {
		setName("");
		setVersion("1.0.0");
		setDesc("");
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
			tags,
		});
		reset();
	};

	const canCreate = name.trim().length > 0 && !isCreating;

	return (
		<Modal
			open={open}
			onOpenChange={handleOpenChange}
			title="Новый документ"
			subtitle="Создайте документ, чтобы добавлять в него endpoints"
			actions={
				<>
					<ModalBtnCancel onClick={close} disabled={isCreating}>
						Отмена
					</ModalBtnCancel>
					<ModalBtnPrimary onClick={submit} disabled={!canCreate} autoFocus>
						{isCreating ? "Создаём…" : "Создать"}
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
			<Field label="Версия">
				<Input
					value={version}
					onChange={(e) => setVersion(e.target.value)}
					placeholder="1.0.0"
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
		</Modal>
	);
};
