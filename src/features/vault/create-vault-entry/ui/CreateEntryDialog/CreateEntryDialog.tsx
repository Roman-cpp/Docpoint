import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./CreateEntryDialog.module.css";

/** Name prompt shared by the "new markdown file" and "new folder" flows. Stays
 *  open on failure so the user can correct a name that already exists. */
export const CreateEntryDialog: FC<{
	title: string;
	subtitle: string;
	placeholder: string;
	errorTitle: string;
	onClose: () => void;
	onCreate: (name: string) => Promise<string>;
}> = ({ title, subtitle, placeholder, errorTitle, onClose, onCreate }) => {
	const [name, setName] = useState("");
	const [saving, setSaving] = useState(false);

	const confirm = async () => {
		if (!name.trim() || saving) return;
		setSaving(true);
		try {
			await onCreate(name);
			onClose();
		} catch (err) {
			toast({
				variant: "error",
				title: errorTitle,
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && !saving && onClose()}>
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				<Dialog.Subtitle>{subtitle}</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<input
					className={s.input}
					type="text"
					placeholder={placeholder}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") confirm();
					}}
					autoFocus
				/>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={onClose} disabled={saving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={confirm} disabled={saving || !name.trim()}>
					{saving ? "Создаём…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
