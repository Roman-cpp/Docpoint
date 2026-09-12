import type { FC } from "react";
import { Checkbox } from "../Checkbox/Checkbox";
import s from "./HeadersEditor.module.css";

/**
 * Заголовок в редакторе. `id` локальный — нужен только как React-ключ,
 * хранится список с порядком.
 */
export interface HeaderDraft {
	id: string;
	name: string;
	value: string;
	enabled: boolean;
}

/** Локальный id строки. NB: `crypto.randomUUID()` требует secure context,
 *  которым webview Tauri на Linux не является, и бросает исключение. */
let seq = 0;
const nextId = () => `hdr-${Date.now().toString(36)}-${++seq}`;

/** Пустая строка заголовка — для инициализации списка снаружи. */
export const createHeaderDraft = (): HeaderDraft => ({
	id: nextId(),
	name: "",
	value: "",
	enabled: true,
});

/** Подсказки в выпадающем списке имени заголовка. */
const COMMON_HEADERS = [
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

const DATALIST_ID = "headers-editor-names";

/** Имена, встречающиеся больше одного раза: победит последнее. */
function findDuplicates(headers: HeaderDraft[]): Set<string> {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const header of headers) {
		const key = header.name.trim().toLowerCase();
		if (!key || !header.enabled) continue;
		if (seen.has(key)) duplicates.add(key);
		seen.add(key);
	}
	return duplicates;
}

interface HeadersEditorProps {
	headers: HeaderDraft[];
	onChange: (headers: HeaderDraft[]) => void;
}

/**
 * Произвольные заголовки запроса. Выключенные строки хранятся, но не
 * отправляются; подстановка `{{VAR}}` в значениях — на стороне вызывающего.
 */
export const HeadersEditor: FC<HeadersEditorProps> = ({
	headers,
	onChange,
}) => {
	const duplicates = findDuplicates(headers);

	const patch = (id: string, fields: Partial<HeaderDraft>) =>
		onChange(
			headers.map((header) =>
				header.id === id ? { ...header, ...fields } : header,
			),
		);

	return (
		<div className={s.group}>
			<div className={s.groupHdr}>
				<span className={s.groupLbl}>Headers</span>
				<button
					type="button"
					className={s.addBtn}
					onClick={() => onChange([...headers, createHeaderDraft()])}
				>
					+ Add header
				</button>
			</div>

			<datalist id={DATALIST_ID}>
				{COMMON_HEADERS.map((name) => (
					<option key={name} value={name} />
				))}
			</datalist>

			{headers.map((header) => {
				const isDuplicate = duplicates.has(header.name.trim().toLowerCase());

				return (
					<div key={header.id} className={s.row}>
						<Checkbox
							checked={header.enabled}
							title={header.enabled ? "Отправляется" : "Не отправляется"}
							onChange={(e) => patch(header.id, { enabled: e.target.checked })}
						/>
						<input
							className={`${s.input} ${s.name}${isDuplicate ? ` ${s.dup}` : ""}`}
							list={DATALIST_ID}
							placeholder="Name"
							title={isDuplicate ? "Заголовок повторяется" : undefined}
							value={header.name}
							onChange={(e) => patch(header.id, { name: e.target.value })}
						/>
						<input
							className={s.input}
							placeholder="Value"
							value={header.value}
							onChange={(e) => patch(header.id, { value: e.target.value })}
						/>
						<button
							type="button"
							className={s.removeBtn}
							title="Remove header"
							onClick={() =>
								onChange(headers.filter((h) => h.id !== header.id))
							}
						>
							×
						</button>
					</div>
				);
			})}
		</div>
	);
};
