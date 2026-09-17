import { type FC, useMemo } from "react";
import type { BodyMode, DocumentNode, Endpoint } from "@/entities/doc-api";
import {
	buildDocumentTree,
	isInsideList,
	readAt,
	writeAt,
} from "@/entities/doc-api";
import { coerceParamValue, parseBodyObject } from "../../lib/buildRequest";
import { formatJson, getJsonError } from "../../lib/validateJson";
import { ParamField } from "../ParamField";
import s from "./BodyEditor.module.css";

/** Листья документа: поля, у которых нет вложенных. */
function leaves(nodes: DocumentNode[]): DocumentNode[] {
	return nodes.flatMap((node) =>
		node.children.length > 0 ? leaves(node.children) : [node],
	);
}

/** Значение поля формы: строка как есть, остальное — как в JSON. */
function fieldText(value: unknown): string {
	if (value === undefined) return "";
	if (value === null) return "null";
	return typeof value === "string" ? value : JSON.stringify(value);
}

/** Что записать обратно в документ: пустая строка убирает поле. */
function fieldValue(text: string, type: string): unknown {
	if (text.trim() === "") return undefined;
	return coerceParamValue(text, type);
}

const MODES: { mode: BodyMode; label: string }[] = [
	{ mode: "fields", label: "Fields" },
	{ mode: "raw", label: "JSON" },
];

interface BodyEditorProps {
	endpoint: Endpoint;
	mode: BodyMode;
	body: string;
	onModeChange: (mode: BodyMode) => void;
	onBodyChange: (body: string) => void;
}

/**
 * Тело запроса — один JSON-документ. Форма по полям схемы и редактор JSON
 * правят его же, поэтому переключение режима ничего не теряет и переносить
 * значения между ними не нужно.
 */
export const BodyEditor: FC<BodyEditorProps> = ({
	endpoint,
	mode,
	body,
	onModeChange,
	onBodyChange,
}) => {
	const jsonError = getJsonError(body);
	// Форма умеет править только JSON-объект: массив, скаляр или сломанный
	// JSON редактируются лишь текстом.
	const doc = parseBodyObject(body);

	// Поля формы — листья документа схемы. Поля внутри массивов пропускаются:
	// какой именно элемент правит строка формы, сказать нельзя, и такие поля
	// остаются на вкладке JSON.
	const fields = useMemo(
		() =>
			leaves(
				buildDocumentTree(endpoint.body ?? "", endpoint.bodyFields ?? []).nodes,
			).filter((node) => !isInsideList(node.path)),
		[endpoint.body, endpoint.bodyFields],
	);

	return (
		<div className={s.group}>
			<div className={s.groupHdr}>
				<span className={s.groupLbl}>Request body</span>
				<div className={s.modes}>
					{MODES.map(({ mode: value, label }) => (
						<button
							key={value}
							type="button"
							className={`${s.mode}${mode === value ? ` ${s.active}` : ""}`}
							onClick={() => onModeChange(value)}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{mode === "fields" ? (
				doc === null ? (
					<div className={s.empty}>
						Тело не является JSON-объектом — правьте его в режиме JSON.
					</div>
				) : fields.length > 0 ? (
					fields.map((field) => (
						<ParamField
							key={field.path}
							name={field.path}
							required={field.required}
							type={field.format || field.type}
							placeholder={field.desc || field.sample}
							value={fieldText(readAt(doc, field.path))}
							onChange={(value) =>
								onBodyChange(
									writeAt(
										body,
										field.path,
										fieldValue(value, field.format || field.type),
									),
								)
							}
						/>
					))
				) : (
					<div className={s.empty}>
						У эндпоинта не описана структура тела — переключитесь на JSON.
					</div>
				)
			) : (
				<>
					<textarea
						className={`${s.editor}${jsonError ? ` ${s.invalid}` : ""}`}
						spellCheck={false}
						placeholder={'{\n  "key": "value"\n}'}
						value={body}
						onChange={(e) => onBodyChange(e.target.value)}
					/>
					<div className={s.editorFooter}>
						{jsonError ? (
							<span className={s.error}>{jsonError}</span>
						) : (
							<span className={s.hint}>Отправляется как есть</span>
						)}
						<div className={s.editorActions}>
							<button
								type="button"
								className={s.action}
								disabled={!!jsonError || !body.trim()}
								onClick={() => onBodyChange(formatJson(body))}
							>
								Format
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};
