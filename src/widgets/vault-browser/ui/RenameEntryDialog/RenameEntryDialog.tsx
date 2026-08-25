import { type FC, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./RenameEntryDialog.module.css";

/** Position of the extension dot, or the whole length when there is none. A
 *  leading dot belongs to the stem, so `.gitignore` selects entirely. */
const stemLength = (name: string): number => {
	const dot = name.lastIndexOf(".");
	return dot > 0 ? dot : name.length;
};

/** Name prompt for renaming a file or a folder. Opens with the current name
 *  and the stem preselected, so typing replaces it but keeps the extension.
 *  Stays open on failure — a taken name is corrected, not retyped. */
export const RenameEntryDialog: FC<{
	/** Current name, shown as the starting value. */
	name: string;
	kind: "file" | "folder";
	onClose: () => void;
	onRename: (name: string) => Promise<unknown>;
}> = ({ name, kind, onClose, onRename }) => {
	const [value, setValue] = useState(name);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const input = inputRef.current;
		if (!input) return;
		input.focus();
		input.setSelectionRange(
			0,
			kind === "file" ? stemLength(name) : name.length,
		);
	}, []);

	const trimmed = value.trim();
	const unchanged = trimmed === name;

	const confirm = async () => {
		if (!trimmed || saving || unchanged) return;
		setSaving(true);
		try {
			await onRename(trimmed);
			onClose();
		} catch (err) {
			toast({
				variant: "error",
				title:
					kind === "file"
						? "Не удалось переименовать файл"
						: "Не удалось переименовать каталог",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !saving && onClose()}>
			<Dialog.Header>
				<Dialog.Title>
					{kind === "file" ? "Переименовать файл" : "Переименовать каталог"}
				</Dialog.Title>
				<Dialog.Subtitle>
					Новое имя в текущем каталоге. Существующее имя занять нельзя.
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<input
					ref={inputRef}
					className={s.input}
					type="text"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") confirm();
					}}
				/>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={saving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary
					onClick={confirm}
					disabled={saving || !trimmed || unchanged}
				>
					{saving ? "Сохраняем…" : "Переименовать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
