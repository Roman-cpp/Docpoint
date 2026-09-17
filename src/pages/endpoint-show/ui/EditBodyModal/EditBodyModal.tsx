import { type FC, useEffect, useMemo, useState } from "react";
import { toast } from "@/core/toast";
import {
	buildDocumentTree,
	type DocumentNode,
	type Endpoint,
	type FieldNote,
	formatDocument,
	isJsonDocument,
} from "@/entities/doc-api";
import { actionUpdateEndpoint, useDocApiStore } from "@/features/doc-api";
import { cx } from "@/shared/lib/cx";
import { TrashIcon } from "@/shared/svg";
import { Checkbox, Input, Select, Textarea } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import s from "./EditBodyModal.module.css";

/** Уточнения типа: только то, чего не видно в самом документе. */
const FORMAT_OPTIONS = [
	{ value: "", label: "—" },
	{ value: "uuid", label: "uuid" },
	{ value: "datetime", label: "datetime" },
	{ value: "date", label: "date" },
	{ value: "email", label: "email" },
	{ value: "integer", label: "integer" },
];

type Tab = "document" | "fields";

/** Строка вкладки «Поля»: путь из документа плюс то, что о нём известно. */
interface Row extends FieldNote {
	/** Поле есть в документе. Иначе это примечание без места — его можно убрать. */
	inDocument: boolean;
	/** Тип из документа; у примечания без места его нет. */
	type: string;
}

const EMPTY: Omit<FieldNote, "path"> = {
	desc: "",
	required: false,
	format: "",
};

/** Пути документа сверху вниз — в том порядке, в котором поля и написаны. */
function flatten(nodes: DocumentNode[]): { path: string; type: string }[] {
	return nodes.flatMap((node) => [
		{ path: node.path, type: node.list ? "array" : node.type },
		...flatten(node.children),
	]);
}

interface EditBodyModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endpoint: Endpoint;
}

/**
 * Правка тела запроса: структура и примечания к её полям.
 *
 * Две вкладки правят одно и то же описание с разных сторон. «Структура» — сам
 * JSON-документ: его удобно вставить целиком из настоящего запроса. «Поля» —
 * список путей, собранный по этому документу, где у каждого появляется
 * описание, обязательность и уточнение типа. Тип полю задаёт документ, поэтому
 * в списке его не выбирают — он показан слева от описания.
 */
export const EditBodyModal: FC<EditBodyModalProps> = ({
	open,
	onOpenChange,
	endpoint,
}) => {
	const updateEndpoint = useDocApiStore(actionUpdateEndpoint);
	const [tab, setTab] = useState<Tab>("document");
	const [body, setBody] = useState(endpoint.body ?? "");
	const [notes, setNotes] = useState<Record<string, FieldNote>>({});
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setTab("document");
		setBody(formatDocument(endpoint.body ?? ""));
		setNotes(
			Object.fromEntries(
				(endpoint.bodyFields ?? []).map((note) => [note.path, note]),
			),
		);
	}, [open, endpoint]);

	// Перечень строк задаёт документ: поправили структуру — список полей
	// перестроился сам, а описания остались при своих путях.
	const rows: Row[] = useMemo(() => {
		const tree = buildDocumentTree(body, Object.values(notes));
		const inDocument = flatten(tree.nodes).map(({ path, type }) => ({
			...EMPTY,
			...notes[path],
			path,
			type,
			inDocument: true,
		}));
		const orphans = tree.orphans.map((note) => ({
			...note,
			type: "",
			inDocument: false,
		}));
		return [...inDocument, ...orphans];
	}, [body, notes]);

	const patch = (path: string, change: Partial<FieldNote>) =>
		setNotes((prev) => ({
			...prev,
			[path]: { ...EMPTY, ...prev[path], ...change, path },
		}));

	const forget = (path: string) =>
		setNotes((prev) => {
			const next = { ...prev };
			delete next[path];
			return next;
		});

	const notJson = body.trim() !== "" && !isJsonDocument(body);

	const save = async () => {
		// Примечание без единого слова ничего не описывает — такие не храним.
		const fields = rows
			.filter((row) => row.desc.trim() !== "" || row.required || row.format)
			.map(({ path, desc, required, format }) => ({
				path,
				desc: desc.trim(),
				required,
				format,
			}));

		try {
			setIsSaving(true);
			await updateEndpoint({
				...endpoint,
				body: body.trim(),
				bodyFields: fields,
			});
			onOpenChange(false);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось сохранить тело запроса",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange} width={720}>
			<Dialog.Header>
				<Dialog.Title>Тело запроса</Dialog.Title>
				<Dialog.Subtitle>
					Структура задаёт форму и типы, примечания — всё остальное
				</Dialog.Subtitle>
				<Dialog.Close />
			</Dialog.Header>

			<Dialog.Body>
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
							onChange={(e) => setBody(e.target.value)}
							rows={16}
							placeholder={'{\n  "title": "",\n  "meta": { "labels": [] }\n}'}
							style={{ fontFamily: "var(--font-mono)" }}
						/>
						<div className={s.paneFoot}>
							<span className={notJson ? s.warn : s.hint}>
								{notJson
									? "Не разбирается как JSON — сохранить можно, но списка полей у такого тела не будет"
									: "Вставьте настоящее тело запроса: структура и типы возьмутся из него"}
							</span>
							<button
								type="button"
								className={s.format}
								onClick={() => setBody(formatDocument(body))}
								disabled={notJson}
							>
								Форматировать
							</button>
						</div>
					</div>
				) : (
					<div className={s.pane}>
						{rows.length === 0 ? (
							<div className={s.empty}>
								Полей нет — опишите структуру на соседней вкладке
							</div>
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
											onChange={(e) =>
												patch(row.path, { desc: e.target.value })
											}
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
			</Dialog.Body>

			<Dialog.Footer>
				<Dialog.BtnCancel
					onClick={() => onOpenChange(false)}
					disabled={isSaving}
				>
					Отмена
				</Dialog.BtnCancel>
				<Dialog.BtnPrimary onClick={save} disabled={isSaving}>
					{isSaving ? "Сохраняем…" : "Сохранить"}
				</Dialog.BtnPrimary>
			</Dialog.Footer>
		</Dialog.Root>
	);
};
