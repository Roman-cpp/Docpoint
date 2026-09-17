import { type FC, useMemo, useState } from "react";
import {
	buildDocumentTree,
	type DocumentNode,
	type FieldNote,
	formatDocument,
	isJsonDocument,
} from "@/entities/doc-api";
import { cx } from "@/shared/lib/cx";
import { TrashIcon } from "@/shared/svg";
import { Checkbox, Input, Select, Textarea } from "@/shared/ui-kit/controls";
import s from "./DocumentEditor.module.css";

/** Уточнения типа: только то, чего не видно в самом документе. */
const FORMAT_OPTIONS = [
	{ value: "", label: "—" },
	{ value: "uuid", label: "uuid" },
	{ value: "datetime", label: "datetime" },
	{ value: "date", label: "date" },
	{ value: "email", label: "email" },
	{ value: "integer", label: "integer" },
];

const EMPTY: Omit<FieldNote, "path"> = {
	desc: "",
	required: false,
	format: "",
};

/** Строка вкладки «Поля»: путь из документа плюс то, что о нём известно. */
interface Row extends FieldNote {
	/** Поле есть в документе. Иначе это примечание без места — его можно убрать. */
	inDocument: boolean;
	/** Тип из документа; у примечания без места его нет. */
	type: string;
}

/** Пути документа сверху вниз — в том порядке, в котором поля и написаны. */
function flatten(nodes: DocumentNode[]): { path: string; type: string }[] {
	return nodes.flatMap((node) => [
		{ path: node.path, type: node.list ? "array" : node.type },
		...flatten(node.children),
	]);
}

interface DocumentEditorProps {
	body: string;
	fields: FieldNote[];
	onChange: (next: { body: string; fields: FieldNote[] }) => void;
	/** Что подсказать под редактором структуры, пока она не вызывает вопросов. */
	hint: string;
	/** Чем подписать место, когда полей ещё нет. */
	empty: string;
	placeholder?: string;
}

/**
 * Правка одного JSON-документа и примечаний к его полям.
 *
 * Две вкладки описывают одно и то же с разных сторон. «Структура» — сам
 * документ: его удобно вставить целиком из настоящего запроса или ответа.
 * «Поля» — собранный по нему список путей, где у каждого появляется описание,
 * обязательность и уточнение типа. Тип полю задаёт документ, поэтому его не
 * выбирают — он показан рядом с путём.
 *
 * Документ, который не разбирается как JSON, сохранить можно: тело и ответ
 * бывают формой, XML или текстом метрик. Полей у такого документа просто нет.
 */
export const DocumentEditor: FC<DocumentEditorProps> = ({
	body,
	fields,
	onChange,
	hint,
	empty,
	placeholder,
}) => {
	const [tab, setTab] = useState<"document" | "fields">("document");

	// Перечень строк задаёт документ: поправили структуру — список полей
	// перестроился сам, а описания остались при своих путях.
	const rows: Row[] = useMemo(() => {
		const tree = buildDocumentTree(body, fields);
		const byPath = new Map(fields.map((note) => [note.path, note]));

		return [
			...flatten(tree.nodes).map(({ path, type }) => ({
				...EMPTY,
				...byPath.get(path),
				path,
				type,
				inDocument: true,
			})),
			...tree.orphans.map((note) => ({
				...note,
				type: "",
				inDocument: false,
			})),
		];
	}, [body, fields]);

	/** Примечание без единого слова ничего не описывает — такие не храним. */
	const withNote = (next: FieldNote[]) =>
		next.filter(
			(note) => note.desc.trim() !== "" || note.required || note.format,
		);

	const patch = (path: string, change: Partial<FieldNote>) => {
		const known = fields.some((note) => note.path === path);
		const next = known
			? fields.map((note) =>
					note.path === path ? { ...note, ...change } : note,
				)
			: [...fields, { path, ...EMPTY, ...change }];
		onChange({ body, fields: withNote(next) });
	};

	const forget = (path: string) =>
		onChange({ body, fields: fields.filter((note) => note.path !== path) });

	const notJson = body.trim() !== "" && !isJsonDocument(body);

	return (
		<div>
			<div className={s.tabs} role="tablist" aria-label="Что правим">
				<button
					type="button"
					role="tab"
					aria-selected={tab === "document"}
					className={cx(s.tab, tab === "document" && s.active)}
					onClick={() => setTab("document")}
				>
					Структура
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={tab === "fields"}
					className={cx(s.tab, tab === "fields" && s.active)}
					onClick={() => setTab("fields")}
				>
					Поля ({rows.length})
				</button>
			</div>

			{tab === "document" ? (
				<div className={s.pane}>
					<Textarea
						value={body}
						onChange={(e) => onChange({ body: e.target.value, fields })}
						rows={14}
						placeholder={placeholder}
						style={{ fontFamily: "var(--font-mono)" }}
					/>
					<div className={s.paneFoot}>
						<span className={notJson ? s.warn : s.hint}>
							{notJson
								? "Не разбирается как JSON — сохранить можно, но списка полей у такого документа не будет"
								: hint}
						</span>
						<button
							type="button"
							className={s.format}
							onClick={() => onChange({ body: formatDocument(body), fields })}
							disabled={notJson}
						>
							Форматировать
						</button>
					</div>
				</div>
			) : (
				<div className={s.pane}>
					{rows.length === 0 ? (
						<div className={s.empty}>{empty}</div>
					) : (
						<>
							<div className={cx(s.row, s.rowHead)}>
								<span>поле</span>
								<span>описание</span>
								<span>формат</span>
								<span />
							</div>
							{rows.map((row) => (
								<div
									className={cx(s.row, !row.inDocument && s.orphan)}
									key={row.path}
								>
									<div className={s.path}>
										<code>{row.path}</code>
										<span className={s.type}>
											{row.inDocument ? row.type : "нет в структуре"}
										</span>
									</div>
									<Input
										size="sm"
										value={row.desc}
										placeholder="что это за поле"
										onChange={(e) => patch(row.path, { desc: e.target.value })}
									/>
									<Select
										size="sm"
										options={FORMAT_OPTIONS}
										value={row.format}
										onChange={(e) =>
											patch(row.path, { format: e.target.value })
										}
									/>
									<div className={s.rowTail}>
										<Checkbox
											size="sm"
											label="обяз."
											checked={row.required}
											onChange={(e) =>
												patch(row.path, { required: e.target.checked })
											}
										/>
										{!row.inDocument && (
											<button
												type="button"
												className={s.removeBtn}
												onClick={() => forget(row.path)}
												aria-label="Убрать примечание"
											>
												<TrashIcon size={13} />
											</button>
										)}
									</div>
								</div>
							))}
						</>
					)}
				</div>
			)}
		</div>
	);
};
