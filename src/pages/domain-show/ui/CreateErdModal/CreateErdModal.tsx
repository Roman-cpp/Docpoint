import { type FC, useState } from "react";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (data: { name: string; desc: string }) => void;
	isSaving?: boolean;
}

/** Collects a name + description for a new ERD diagram attached to the domain. */
export const CreateErdModal: FC<Props> = ({
	open,
	onOpenChange,
	onCreate,
	isSaving,
}) => {
	const [name, setName] = useState("");
	const [desc, setDesc] = useState("");

	const close = () => {
		if (isSaving) return;
		setName("");
		setDesc("");
		onOpenChange(false);
	};

	const canSave = name.trim().length > 0;

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
			<Dialog.Header>
				<Dialog.Title>Новая ERD-диаграмма</Dialog.Title>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<Field label="Название" required>
					{/* biome-ignore lint/a11y/noAutofocus: focusing the first field on open */}
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Например, Схема заказов"
						autoFocus
					/>
				</Field>
				<Field label="Описание">
					<Textarea
						value={desc}
						onChange={(e) => setDesc(e.target.value)}
						placeholder="Необязательно"
						rows={3}
					/>
				</Field>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary
					onClick={() =>
						canSave &&
						!isSaving &&
						onCreate({ name: name.trim(), desc: desc.trim() })
					}
					disabled={!canSave || isSaving}
				>
					{isSaving ? "Создаём…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
