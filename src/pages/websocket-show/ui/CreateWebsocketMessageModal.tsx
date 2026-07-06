import { type FC, useEffect, useState } from "react";
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
	onSubmit: (data: WebsocketMessageFormValues) => void;
	isSaving?: boolean;
}

const EMPTY: WebsocketMessageFormValues = { name: "", payload: "", desc: "" };

/** Create a new saved WebSocket example frame (name, payload, description). */
export const CreateWebsocketMessageModal: FC<Props> = ({
	open,
	onOpenChange,
	onSubmit,
	isSaving,
}) => {
	const [values, setValues] = useState<WebsocketMessageFormValues>(EMPTY);

	// Reset the fields whenever the dialog opens.
	useEffect(() => {
		if (open) setValues(EMPTY);
	}, [open]);

	const close = () => {
		if (isSaving) return;
		onOpenChange(false);
	};

	const canSave = isValid(values);

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
			<Dialog.Header>
				<Dialog.Title>Новое сообщение</Dialog.Title>
				<Dialog.Close />
			</Dialog.Header>
			<Dialog.Body>
				<WebsocketMessageFields values={values} onChange={setValues} />
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.BtnCancel onClick={close} disabled={isSaving}>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary
					onClick={() => canSave && !isSaving && onSubmit(trimmed(values))}
					disabled={!canSave || isSaving}
				>
					{isSaving ? "Сохраняем…" : "Создать"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
