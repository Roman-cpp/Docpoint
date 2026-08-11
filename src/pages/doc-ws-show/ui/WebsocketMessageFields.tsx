import type { FC } from "react";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";

export interface WebsocketMessageFormValues {
	name: string;
	payload: string;
	desc: string;
}

interface Props {
	values: WebsocketMessageFormValues;
	onChange: (values: WebsocketMessageFormValues) => void;
}

/** Name / payload / description inputs shared by the create and edit modals. */
export const WebsocketMessageFields: FC<Props> = ({ values, onChange }) => (
	<>
		<Field label="Название" required>
			<Input
				value={values.name}
				onChange={(e) => onChange({ ...values, name: e.target.value })}
				placeholder="Например, Subscribe"
				autoFocus
			/>
		</Field>
		<Field label="Payload" required>
			<Textarea
				value={values.payload}
				onChange={(e) => onChange({ ...values, payload: e.target.value })}
				placeholder='{ "op": "subscribe", "streams": "…" }'
				rows={5}
			/>
		</Field>
		<Field label="Описание">
			<Textarea
				value={values.desc}
				onChange={(e) => onChange({ ...values, desc: e.target.value })}
				placeholder="Необязательно"
				rows={2}
			/>
		</Field>
	</>
);

export const isValid = (values: WebsocketMessageFormValues): boolean =>
	values.name.trim().length > 0 && values.payload.trim().length > 0;

export const trimmed = (
	values: WebsocketMessageFormValues,
): WebsocketMessageFormValues => ({
	name: values.name.trim(),
	payload: values.payload.trim(),
	desc: values.desc.trim(),
});
