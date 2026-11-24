import { type FC, useId } from "react";
import { Checkbox } from "../Checkbox/Checkbox";
import s from "./NameValueEditor.module.css";

/**
 * Строка списка «имя-значение»: заголовок, кука, что угодно с таким же видом.
 * `id` локальный — нужен только как React-ключ, хранится список с порядком.
 */
export interface NameValueDraft {
	id: string;
	name: string;
	value: string;
	enabled: boolean;
}

/** Локальный id строки. NB: `crypto.randomUUID()` требует secure context,
 *  которым webview Tauri на Linux не является, и бросает исключение. */
let seq = 0;
const nextId = () => `nv-${Date.now().toString(36)}-${++seq}`;

/** Пустая строка — для инициализации списка снаружи. */
export const createNameValueDraft = (): NameValueDraft => ({
	id: nextId(),
	name: "",
	value: "",
	enabled: true,
});

/** Подсказки для списка заголовков — самые частые имена. */
export const COMMON_HEADER_NAMES = [
	"Accept",
	"Accept-Language",
	"Authorization",
	"Cache-Control",
	"Content-Type",
	"Cookie",
	"Idempotency-Key",
	"User-Agent",
	"X-Api-Key",
	"X-Request-Id",
];

/** Имена, встречающиеся больше одного раза: победит последнее. */
function findDuplicates(rows: NameValueDraft[]): Set<string> {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const row of rows) {
		const key = row.name.trim().toLowerCase();
		if (!key || !row.enabled) continue;
		if (seen.has(key)) duplicates.add(key);
		seen.add(key);
	}
	return duplicates;
}

interface NameValueEditorProps {
	rows: NameValueDraft[];
	onChange: (rows: NameValueDraft[]) => void;
	/** Подпись списка: «Headers», «Cookies». */
	title: string;
	/** Подпись кнопки добавления. */
	addLabel: string;
	/** Что подсказывать в поле имени. */
	suggestions?: string[];
	/** Чем объяснить повтор имени: у заголовка и куки причина одна, слова разные. */
	duplicateHint?: string;
}

/**
 * Список пар «имя-значение» с флагом отправки у каждой: выключенная строка
 * хранится, но не уходит в запрос. Подстановка `{{VAR}}` в значениях — на
 * стороне вызывающего.
 */
export const NameValueEditor: FC<NameValueEditorProps> = ({
	rows,
	onChange,
	title,
	addLabel,
	suggestions,
	duplicateHint = "Имя повторяется",
}) => {
	const listId = useId();
	const duplicates = findDuplicates(rows);

	const patch = (id: string, fields: Partial<NameValueDraft>) =>
		onChange(rows.map((row) => (row.id === id ? { ...row, ...fields } : row)));

	return (
		<div className={s.group}>
			<div className={s.groupHdr}>
				<span className={s.groupLbl}>{title}</span>
				<button
					type="button"
					className={s.addBtn}
					onClick={() => onChange([...rows, createNameValueDraft()])}
				>
					{addLabel}
				</button>
			</div>

			{suggestions && (
				<datalist id={listId}>
					{suggestions.map((name) => (
						<option key={name} value={name} />
					))}
				</datalist>
			)}

			{rows.map((row) => {
				const isDuplicate = duplicates.has(row.name.trim().toLowerCase());

				return (
					<div key={row.id} className={s.row}>
						<Checkbox
							checked={row.enabled}
							title={row.enabled ? "Отправляется" : "Не отправляется"}
							onChange={(e) => patch(row.id, { enabled: e.target.checked })}
						/>
						<input
							className={`${s.input} ${s.name}${isDuplicate ? ` ${s.dup}` : ""}`}
							list={suggestions ? listId : undefined}
							placeholder="Name"
							title={isDuplicate ? duplicateHint : undefined}
							value={row.name}
							onChange={(e) => patch(row.id, { name: e.target.value })}
						/>
						<input
							className={s.input}
							placeholder="Value"
							value={row.value}
							onChange={(e) => patch(row.id, { value: e.target.value })}
						/>
						<button
							type="button"
							className={s.removeBtn}
							title="Убрать строку"
							onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
						>
							×
						</button>
					</div>
				);
			})}
		</div>
	);
};
