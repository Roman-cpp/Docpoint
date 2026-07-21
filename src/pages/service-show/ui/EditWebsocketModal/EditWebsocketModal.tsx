import { type FC, useState } from "react";
import type { DocWebsocket } from "@/entities/websocket";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	websocket: DocWebsocket;
	onSave: (data: {
		id: string;
		name: string;
		desc: string;
		url: string;
	}) => void;
	isSaving?: boolean;
}

/** Edits the name, URL and description of an existing WebSocket doc. */
export const EditWebsocketModal: FC<Props> = ({
	open,
	onOpenChange,
	websocket,
	onSave,
	isSaving,
}) => {
	const [name, setName] = useState(websocket.name);
	const [url, setUrl] = useState(websocket.url);
	const [desc, setDesc] = useState(websocket.desc);

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
						onSave({
							id: websocket.id,
							name: name.trim(),
							desc: desc.trim(),
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
