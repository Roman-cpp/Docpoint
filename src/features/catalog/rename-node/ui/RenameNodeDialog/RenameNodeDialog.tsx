import { type FC, useState } from "react";
import type { CatalogNode } from "@/entities/catalog";
import { KIND_LABEL } from "@/entities/catalog";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

interface RenameNodeDialogProps {
	node: CatalogNode;
	isSaving?: boolean;
	onClose: () => void;
	onRename: (name: string, desc: string) => Promise<unknown>;
}

/** Переименование узла любого вида: имя документа и каталога живёт в одном
 *  месте, поэтому окно одно. Занятое имя правят здесь же — на ошибке диалог
 *  остаётся открытым. */
export const RenameNodeDialog: FC<RenameNodeDialogProps> = ({
	node,
	isSaving = false,
	onClose,
	onRename,
}) => {
	const [name, setName] = useState(node.name);
	const [desc, setDesc] = useState(node.desc);

	const trimmed = name.trim();
	const unchanged = trimmed === node.name && desc.trim() === node.desc;

	const submit = async () => {
		if (!trimmed || unchanged || isSaving) return;
		try {
			await onRename(trimmed, desc.trim());
			onClose();
		} catch {
			/* тост показывает мутация */
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !isSaving && onClose()}>
			<Dialog.Header>
				<Dialog.Title>Переименовать: {KIND_LABEL[node.kind]}</Dialog.Title>
				<Dialog.Subtitle>
					Имя должно быть свободно среди соседей по каталогу.
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
				<Field label="Название" required>
					<Input
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") submit();
						}}
						style={{ width: "100%" }}
					/>
				</Field>
				<Field label="Описание">
					<Textarea
						value={desc}
						onChange={(e) => setDesc(e.target.value)}
						rows={3}
						style={{ width: "100%" }}
					/>
				</Field>
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary
					onClick={submit}
					disabled={!trimmed || unchanged || isSaving}
				>
					{isSaving ? "Сохраняем…" : "Сохранить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
