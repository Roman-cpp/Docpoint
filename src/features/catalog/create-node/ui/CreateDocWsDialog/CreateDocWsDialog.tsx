import { type FC, useState } from "react";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import type { CreateNodeDialogProps } from "../../model/create-node.type";
import { useCreateNode } from "../../model/useCreateNode";
import { CreateDialogShell } from "../CreateDialogShell";

/** Новый документ WebSocket-подключения: имя и адрес, к которому подключаться. */
export const CreateDocWsDialog: FC<CreateNodeDialogProps> = ({
	parentName,
	isSaving = false,
	onClose,
	onCreate,
}) => {
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [desc, setDesc] = useState("");
	const create = useCreateNode({ isSaving, onClose, onCreate });

	const trimmed = name.trim();
	const submit = () =>
		create(
			trimmed
				? {
						name: trimmed,
						desc: desc.trim(),
						payload: { kind: "docWs", url: url.trim() },
					}
				: null,
		);

	return (
		<CreateDialogShell
			title="Новый WebSocket"
			parentName={parentName}
			canCreate={!!trimmed}
			isSaving={isSaving}
			onClose={onClose}
			onSubmit={submit}
		>
			<Field label="Название" required>
				<Input
					autoFocus
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") submit();
					}}
					placeholder="Например, Market stream"
					style={{ width: "100%" }}
				/>
			</Field>

			<Field label="Адрес" hint="ws:// или wss://">
				<Input
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="wss://stream.example.com/ws"
					style={{ width: "100%", fontFamily: "var(--font-mono)" }}
				/>
			</Field>

			<Field label="Описание">
				<Textarea
					value={desc}
					onChange={(e) => setDesc(e.target.value)}
					placeholder="Что за поток и что в нём приходит"
					rows={3}
					style={{ width: "100%" }}
				/>
			</Field>
		</CreateDialogShell>
	);
};
