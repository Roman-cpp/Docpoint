import { type FC, useEffect, useState } from "react";
import type { WebsocketMessage } from "@/entities/websocket-message";
import { Dialog } from "@/shared/ui-kit/modal";
import {
	isValid,
	trimmed,
	WebsocketMessageFields,
	type WebsocketMessageFormValues,
} from "./WebsocketMessageFields";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The message being edited. */
	message: WebsocketMessage;
	onSubmit: (data: WebsocketMessageFormValues) => void;
	onDelete: () => void;
	isSaving?: boolean;
	isDeleting?: boolean;
}

/** Edit an existing saved WebSocket example frame (name, payload, description). */
export const EditWebsocketMessageModal: FC<Props> = ({
	open,
	onOpenChange,
	message,
	onSubmit,
	onDelete,
	isSaving,
	isDeleting,
}) => {
	const [values, setValues] = useState<WebsocketMessageFormValues>({
		name: message.name,
		payload: message.payload,
		desc: message.desc,
	});

	// Reset the fields whenever the dialog opens for a different message.
	useEffect(() => {
		if (!open) return;
		setValues({
			name: message.name,
			payload: message.payload,
			desc: message.desc,
		});
	}, [open, message]);

	const busy = isSaving || isDeleting;

	const close = () => {
		if (busy) return;
		onOpenChange(false);
	};

	const canSave = isValid(values);

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
			<Dialog.Header>
				<Dialog.Title>Редактировать сообщение</Dialog.Title>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<WebsocketMessageFields values={values} onChange={setValues} />
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnDanger onClick={() => !busy && onDelete()} disabled={busy}>
					{isDeleting ? "Удаляем…" : "Удалить"}
				</Dialog.BtnDanger>
				<Dialog.BtnCancel onClick={close} disabled={busy}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary
					onClick={() => canSave && !busy && onSubmit(trimmed(values))}
					disabled={!canSave || busy}
				>
					{isSaving ? "Сохраняем…" : "Сохранить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
