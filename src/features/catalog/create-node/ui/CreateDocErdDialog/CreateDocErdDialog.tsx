import { type FC, useState } from "react";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import type { CreateNodeDialogProps } from "../../model/create-node.type";
import { useCreateNode } from "../../model/useCreateNode";
import { CreateDialogShell } from "../CreateDialogShell";

/** Новая ERD-диаграмма. Таблицы и связи заводятся уже на её холсте. */
export const CreateDocErdDialog: FC<CreateNodeDialogProps> = ({
	parentName,
	isSaving = false,
	onClose,
	onCreate,
}) => {
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");
	const create = useCreateNode({ isSaving, onClose, onCreate });

	const trimmed = name.trim();
	const submit = () =>
		create(
			trimmed
				? { name: trimmed, desc: desc.trim(), payload: { kind: "docErd" } }
				: null,
		);

	return (
		<CreateDialogShell
			title="Новая ERD-диаграмма"
			parentName={parentName}
			canCreate={!!trimmed}
			isSaving={isSaving}
			onClose={onClose}
			onSubmit={submit}
		>
			<Field label="Название" required>
				<Input
					autoFocus
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") submit();
					}}
					placeholder="Например, Схема биллинга"
					style={{ width: "100%" }}
				/>
			</Field>

			<Field label="Описание">
				<Textarea
					value={desc}
					onChange={(e) => setDesc(e.target.value)}
					placeholder="Что за схема и зачем"
					rows={3}
					style={{ width: "100%" }}
				/>
			</Field>
		</CreateDialogShell>
	);
};
