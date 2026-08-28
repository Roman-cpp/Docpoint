import { type FC, useState } from "react";
import { Field, Input, Textarea } from "@/shared/ui-kit/controls";
import type { CreateNodeDialogProps } from "../../model/create-node.type";
import { useCreateNode } from "../../model/useCreateNode";
import { CreateDialogShell } from "../CreateDialogShell";

/** Версия по умолчанию: документ без версии читается хуже, чем с очевидной. */
const DEFAULT_VERSION = "1.0.0";

/** Новый документ HTTP API: версия, префикс путей и теги — его собственные
 *  поля, эндпоинты добавляются уже внутри документа. */
export const CreateDocApiDialog: FC<CreateNodeDialogProps> = ({
	parentName,
	isSaving = false,
	onClose,
	onCreate,
}) => {
	const [name, setName] = useState("");
	const [version, setVersion] = useState(DEFAULT_VERSION);
	const [prefix, setPrefix] = useState("");
	const [desc, setDesc] = useState("");
	const [tagsInput, setTagsInput] = useState("");
	const create = useCreateNode({ isSaving, onClose, onCreate });

	const trimmed = name.trim();
	const submit = () =>
		create(
			trimmed
				? {
						name: trimmed,
						desc: desc.trim(),
						payload: {
							kind: "docApi",
							version: version.trim() || DEFAULT_VERSION,
							prefix: prefix.trim(),
							tags: tagsInput
								.split(",")
								.map((tag) => tag.trim())
								.filter(Boolean),
						},
					}
				: null,
		);

	return (
		<CreateDialogShell
			title="Новый API-документ"
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
					placeholder="Например, Payments API"
					style={{ width: "100%" }}
				/>
			</Field>

			<Field label="Версия">
				<Input
					value={version}
					onChange={(e) => setVersion(e.target.value)}
					placeholder={DEFAULT_VERSION}
					style={{ width: "100%", fontFamily: "var(--font-mono)" }}
				/>
			</Field>

			<Field
				label="Префикс"
				hint="дописывается после префикса окружения ко всем путям документа"
			>
				<Input
					value={prefix}
					onChange={(e) => setPrefix(e.target.value)}
					placeholder="/payments"
					style={{ width: "100%", fontFamily: "var(--font-mono)" }}
				/>
			</Field>

			<Field label="Описание">
				<Textarea
					value={desc}
					onChange={(e) => setDesc(e.target.value)}
					placeholder="За что отвечает этот API"
					rows={3}
					style={{ width: "100%" }}
				/>
			</Field>

			<Field label="Теги" hint="Список через запятую">
				<Input
					value={tagsInput}
					onChange={(e) => setTagsInput(e.target.value)}
					placeholder="payments, v1, internal"
					style={{ width: "100%", fontFamily: "var(--font-mono)" }}
				/>
			</Field>
		</CreateDialogShell>
	);
};
