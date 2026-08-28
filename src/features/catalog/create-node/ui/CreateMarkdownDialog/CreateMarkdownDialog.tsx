import { type FC, useState } from "react";
import { withMarkdownExt } from "@/entities/markdown";
import { Field, Input } from "@/shared/ui-kit/controls";
import type { CreateNodeDialogProps } from "../../model/create-node.type";
import { useCreateNode } from "../../model/useCreateNode";
import { CreateDialogShell } from "../CreateDialogShell";

/** Новый markdown-документ. Описания у него нет — его роль играет сам текст,
 *  поэтому документ сразу открывается с заголовком из имени. */
export const CreateMarkdownDialog: FC<CreateNodeDialogProps> = ({
	parentName,
	isSaving = false,
	onClose,
	onCreate,
}) => {
	const [name, setName] = useState("");
	const create = useCreateNode({ isSaving, onClose, onCreate });

	const trimmed = name.trim();
	const title = trimmed.replace(/\.md$/i, "");

	const submit = () =>
		create(
			trimmed
				? {
						name: withMarkdownExt(trimmed),
						desc: "",
						payload: { kind: "markdown", content: `# ${title}\n` },
					}
				: null,
		);

	return (
		<CreateDialogShell
			title="Новый markdown-документ"
			parentName={parentName}
			canCreate={!!trimmed}
			isSaving={isSaving}
			onClose={onClose}
			onSubmit={submit}
		>
			<Field label="Название" hint="расширение .md добавится само" required>
				<Input
					autoFocus
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") submit();
					}}
					placeholder="Например, quickstart"
					style={{ width: "100%" }}
				/>
			</Field>
		</CreateDialogShell>
	);
};
