import { type FC, useState } from "react";
import type { DocWebsocket } from "@/entities/websocket";
import { Field, Input } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	websocket: DocWebsocket;
	onSave: (data: { id: string; name: string; url: string }) => void;
	isSaving?: boolean;
}

/** Edits the name and URL of an existing WebSocket doc. */
export const EditWebsocketModal: FC<Props> = ({
	open,
	onOpenChange,
	websocket,
	onSave,
	isSaving,
}) => {
	const [name, setName] = useState(websocket.name);
	const [url, setUrl] = useState(websocket.url);

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const canSave = name.trim().length > 0 && url.trim().length > 0 && !isSaving;

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
			<Dialog.Header>
				<Dialog.Title>Редактировать WebSocket</Dialog.Title>
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
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary
					onClick={() =>
						canSave &&
						onSave({
							id: websocket.id,
							name: name.trim(),
							url: url.trim(),
						})
					}
					disabled={!canSave}
				>
					{isSaving ? "Сохраняем…" : "Сохранить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
