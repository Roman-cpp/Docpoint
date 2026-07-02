import { type FC, useState } from "react";
import { MarkdownEditor } from "@/shared/ui-kit/MarkdownEditor";
import { type SaveStatus, useDocApiContent } from "../model/useDocApiContent";
import s from "./DocApiContentEditor.module.css";

const STATUS_LABEL: Record<SaveStatus, string> = {
	loading: "Загрузка…",
	idle: "",
	saving: "Сохранение…",
	saved: "Сохранено",
	error: "Ошибка сохранения",
};

interface DocApiContentEditorProps {
	docId: string;
}

/** Markdown body editor for a doc: live-preview editing with autosave to disk. */
export const DocApiContentEditor: FC<DocApiContentEditorProps> = ({
	docId,
}) => {
	const { content, status, onChange } = useDocApiContent(docId);
	const [rawSource, setRawSource] = useState(false);

	return (
		<div className={s.wrap}>
			<div className={s.toolbar}>
				<button
					type="button"
					className={s.modeBtn}
					onClick={() => setRawSource((v) => !v)}
				>
					{rawSource ? "Live Preview" : "Source"}
				</button>
				<span className={s.status}>{STATUS_LABEL[status]}</span>
			</div>
			<div className={s.editor}>
				<MarkdownEditor
					value={content}
					onChange={onChange}
					rawSource={rawSource}
				/>
			</div>
		</div>
	);
};
