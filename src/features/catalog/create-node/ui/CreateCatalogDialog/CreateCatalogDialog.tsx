import { type FC, useState } from "react";
import { Field, Input } from "@/shared/ui-kit/controls";
import type { CreateNodeDialogProps } from "../../model/create-node.type";
import { useCreateNode } from "../../model/useCreateNode";
import { CreateDialogShell } from "../CreateDialogShell";

/** Новая папка дерева. Кроме имени у каталога ничего своего нет. */
export const CreateCatalogDialog: FC<CreateNodeDialogProps> = ({
	parentName,
	isSaving = false,
	onClose,
	onCreate,
}) => {
	const [name, setName] = useState("");
	const create = useCreateNode({ isSaving, onClose, onCreate });

	const trimmed = name.trim();
	const submit = () =>
		create(
			trimmed
				? { name: trimmed, desc: "", payload: { kind: "catalog" } }
				: null,
		);

	return (
		<CreateDialogShell
			title="Новый каталог"
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
					placeholder="Например, Биллинг"
					style={{ width: "100%" }}
				/>
			</Field>
		</CreateDialogShell>
	);
};
