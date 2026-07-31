import type { FC } from "react";
import type { BodyMode, Endpoint } from "@/entities/doc-api";
import type { Environment } from "@/entities/environment";
import { buildBody, readValue, valueKey } from "../../lib/buildRequest";
import { formatJson, getJsonError } from "../../lib/validateJson";
import type { ParamValues } from "../../model/tryIt.types";
import { ParamField } from "../ParamField";
import s from "./BodyEditor.module.css";

const MODES: { mode: BodyMode; label: string }[] = [
	{ mode: "fields", label: "Fields" },
	{ mode: "raw", label: "JSON" },
];

interface BodyEditorProps {
	endpoint: Endpoint;
	env: Environment;
	mode: BodyMode;
	rawBody: string;
	values: ParamValues;
	onModeChange: (mode: BodyMode) => void;
	onRawBodyChange: (rawBody: string) => void;
	onValueChange: (key: string, value: string) => void;
}

/**
 * Тело запроса: либо по полям схемы эндпоинта, либо сырым JSON, который
 * уходит на сервер без обработки. Оба варианта хранятся одновременно.
 */
export const BodyEditor: FC<BodyEditorProps> = ({
	endpoint,
	env,
	mode,
	rawBody,
	values,
	onModeChange,
	onRawBodyChange,
	onValueChange,
}) => {
	const bodyParams = endpoint.bodyParams ?? [];
	const jsonError = getJsonError(rawBody);

	/** Переносит текущие значения полей в сырое тело, чтобы не набирать заново. */
	const prefillFromFields = () =>
		onRawBodyChange(formatJson(buildBody(endpoint, env, values) ?? "{}"));

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
				bodyParams.length > 0 ? (
					bodyParams.map((param) => (
						<ParamField
							key={param.name}
							name={param.name}
							required={param.required}
							type={param.type}
							placeholder={
								param.default ? `default: ${param.default}` : param.desc
							}
							value={readValue(values, "body", param.name, param.value)}
							onChange={(value) =>
								onValueChange(valueKey("body", param.name), value)
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
						value={rawBody}
						onChange={(e) => onRawBodyChange(e.target.value)}
					/>
					<div className={s.editorFooter}>
						{jsonError ? (
							<span className={s.error}>{jsonError}</span>
						) : (
							<span className={s.hint}>Отправляется как есть</span>
						)}
						<div className={s.editorActions}>
							{bodyParams.length > 0 && (
								<button
									type="button"
									className={s.action}
									onClick={prefillFromFields}
								>
									Prefill from fields
								</button>
							)}
							<button
								type="button"
								className={s.action}
								disabled={!!jsonError || !rawBody.trim()}
								onClick={() => onRawBodyChange(formatJson(rawBody))}
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
