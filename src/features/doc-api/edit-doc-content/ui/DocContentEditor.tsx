import { type FC, useState } from "react";
import { MarkdownEditor } from "@/shared/ui-kit/MarkdownEditor";
import { type SaveStatus, useDocContent } from "../model/useDocContent";
import s from "./DocContentEditor.module.css";

const STATUS_LABEL: Record<SaveStatus, string> = {
	loading: "Загрузка…",
	idle: "",
	saving: "Сохранение…",
	saved: "Сохранено",
	error: "Ошибка сохранения",
};

interface DocContentEditorProps {
	docId: string;
}

/** Markdown body editor for a doc: live-preview editing with autosave to disk. */
export const DocContentEditor: FC<DocContentEditorProps> = ({ docId }) => {
	const { content, status, onChange } = useDocContent(docId);
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
