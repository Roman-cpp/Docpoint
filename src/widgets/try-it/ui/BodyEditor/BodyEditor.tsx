import type { FC } from "react";
import type { BodyMode, Endpoint } from "@/entities/doc-api";
import {
	bodyFieldText,
	parseBodyObject,
	setBodyField,
} from "../../lib/buildRequest";
import { formatJson, getJsonError } from "../../lib/validateJson";
import { ParamField } from "../ParamField";
import s from "./BodyEditor.module.css";

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
	const bodyParams = endpoint.bodyParams ?? [];
	const jsonError = getJsonError(body);
	// Форма умеет править только JSON-объект: массив, скаляр или сломанный
	// JSON редактируются лишь текстом.
	const doc = parseBodyObject(body);

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
				) : bodyParams.length > 0 ? (
					bodyParams.map((param) => (
						<ParamField
							key={param.name}
							name={param.name}
							required={param.required}
							type={param.type}
							placeholder={
								param.default ? `default: ${param.default}` : param.desc
							}
							value={bodyFieldText(doc, param.name, param.value)}
							onChange={(value) =>
								onBodyChange(setBodyField(body, param.name, param.type, value))
							}
						/>
					))
				) : (
					<div className={s.empty}>
						В схеме эндпоинта нет полей тела — переключитесь на JSON.
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
