import type { FC } from "react";
import { Checkbox } from "@/shared/ui-kit/controls";
import type { HeaderDraft } from "../../model/tryIt.types";
import s from "./HeadersEditor.module.css";

const emptyHeader = (): HeaderDraft => ({
	id: crypto.randomUUID(),
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

const DATALIST_ID = "try-it-header-names";

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
 * Произвольные заголовки запроса. Значения понимают `{{VAR}}` из окружения,
 * выключенные строки хранятся, но не отправляются.
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
					onClick={() => onChange([...headers, emptyHeader()])}
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
