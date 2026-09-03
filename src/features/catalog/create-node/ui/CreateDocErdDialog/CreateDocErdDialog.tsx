import { type FC, useState } from "react";
import { Field, Input } from "@/shared/ui-kit/controls";
import type { CreateNodeDialogProps } from "../../model/create-node.type";
import { useCreateNode } from "../../model/useCreateNode";
import { CreateDialogShell } from "../CreateDialogShell";

/** Новая ERD-диаграмма. Таблицы и связи заводятся уже на её холсте. */
export const CreateDocErdDialog: FC<CreateNodeDialogProps> = ({
	isSaving = false,
	onClose,
	onCreate,
}) => {
	const [name, setName] = useState("");
	const create = useCreateNode({ isSaving, onClose, onCreate });

	const trimmed = name.trim();
	const submit = () =>
		create(trimmed ? { name: trimmed, payload: { kind: "docErd" } } : null);

	return (
		<CreateDialogShell
			title="Новая ERD-диаграмма"
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
		</CreateDialogShell>
	);
};
