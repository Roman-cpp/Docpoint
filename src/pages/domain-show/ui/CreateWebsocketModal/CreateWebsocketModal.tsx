import { type FC, useState } from "react";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (data: { name: string; desc: string; url: string }) => void;
	isSaving?: boolean;
}

/** Collects a name, URL and description for a new WebSocket attached to the domain. */
export const CreateWebsocketModal: FC<Props> = ({
	open,
	onOpenChange,
	onCreate,
	isSaving,
}) => {
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [desc, setDesc] = useState("");

	const close = () => {
		if (isSaving) return;
		setName("");
		setUrl("");
		setDesc("");
		onOpenChange(false);
	};

	const canSave = name.trim().length > 0 && url.trim().length > 0;

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
			<Dialog.Header>
				<Dialog.Title>Новый WebSocket</Dialog.Title>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<Field label="Название" required>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Например, Стрим котировок"
						autoFocus
					/>
				</Field>
				<Field label="URL" required>
					<Input
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder="wss://example.com/ws"
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
						onCreate({
							name: name.trim(),
							desc: desc.trim(),
							url: url.trim(),
						})
					}
					disabled={!canSave || isSaving}
				>
					{isSaving ? "Создаём…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
