import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import { useCatalogNode } from "@/entities/catalog";
import {
	type ColumnDiff,
	createRelationApi,
	type ErdDiff,
	type TableDiff,
} from "@/entities/doc-erd";
import { useImportErd } from "@/features/doc-erd";
import { Button, Checkbox } from "@/shared/ui-kit/controls";
import s from "./ErdComparePanel.module.css";

interface ErdComparePanelProps {
	/** Диаграмма, которую сверяли. */
	docErdId: string;
	diff: ErdDiff;
	/** Идёт ли повторное сравнение — кнопки на это время гаснут. */
	busy?: boolean;
	onRefresh: () => void;
	onClose: () => void;
	/** Документ изменился: страница перечитывает диаграмму и сверяет заново. */
	onChanged: () => void;
}

const fold = (name: string) => name.trim().toLowerCase();

const SIGN: Record<string, string> = {
	onlyInDb: "+",
	onlyInDoc: "−",
	differs: "≠",
};

/** Расхождение колонки словами: цвет и знак говорят «что», строка — «чем». */
const explain = (column: ColumnDiff): string => {
	if (column.status === "onlyInDb") return column.dbType ?? "";
	if (column.status === "onlyInDoc") return column.docType ?? "";
	const flags = column.mismatch.map((kind) =>
		kind === "nullable"
			? column.nullable
				? "в базе NULL"
				: "в базе NOT NULL"
			: column.pk
				? "в базе первичный ключ"
				: "в базе не ключ",
	);

	// Типы сравнение не сверяет — в документе их пишет человек, — но показать
	// оба стоит: расхождение видно глазом, а решение всё равно за человеком.
	const types =
		column.docType && column.dbType && column.docType !== column.dbType
			? `${column.docType} → ${column.dbType}`
			: null;

	return [...flags, types].filter(Boolean).join(" · ");
};

/**
 * Итог сравнения диаграммы с живой базой: легенда к цветам на холсте, счётчики
 * и разбор расхождений по таблицам.
 *
 * Отсюда же расхождение можно закрыть в одну сторону — перенести в документ то,
 * что нашлось в базе. Обратного направления нет намеренно: менять схему живой
 * базы из редактора документации — не то же самое, что дорисовать таблицу.
 */
export const ErdComparePanel: FC<ErdComparePanelProps> = ({
	docErdId,
	diff,
	busy,
	onRefresh,
	onClose,
	onChanged,
}) => {
	const { node } = useCatalogNode(docErdId);
	const { importErdAsync, isImportingErd } = useImportErd({
		platformId: node?.platformId ?? "",
		parentId: node?.parentId ?? null,
	});
	const [picked, setPicked] = useState<Set<string>>(new Set());
	const [linking, setLinking] = useState(false);

	const onlyInDb = diff.tables.filter((t) => t.id === null);
	const onlyInDoc = diff.tables.filter((t) => t.status === "onlyInDoc");
	const differs = diff.tables.filter((t) => t.status === "differs");
	const newRelations = diff.relations.filter((r) => r.status === "onlyInDb");

	// Связь заводится по id сущностей, поэтому нарисовать можно только те, у
	// которых обе стороны уже лежат в документе. Для остальных сперва нужно
	// перенести таблицу — и следующее сравнение покажет связь уже готовой.
	const idByName = new Map(
		diff.tables
			.filter((t) => t.id !== null)
			.map((t) => [fold(t.name), t.id as string]),
	);
	const drawable = newRelations.filter(
		(r) => idByName.has(fold(r.fromTable)) && idByName.has(fold(r.toTable)),
	);

	const working = busy || isImportingErd || linking;

	const toggle = (name: string) =>
		setPicked((prev) => {
			const next = new Set(prev);
			if (!next.delete(name)) next.add(name);
			return next;
		});

	const adopt = async () => {
		const tables = onlyInDb
			.filter((t) => picked.has(t.name))
			.map((t) => ({ name: t.name, desc: "", fields: t.fields }));
		if (tables.length === 0) return;

		// Связи берём только между переносимыми таблицами: концы адресованы
		// именами, и связь на таблицу, которой в посылке нет, импорт не разрешит.
		const relations = newRelations
			.filter((r) => picked.has(r.fromTable) && picked.has(r.toTable))
			.map((r) => ({
				fromTable: r.fromTable,
				fromColumn: r.fromColumn,
				toTable: r.toTable,
				toColumn: r.toColumn,
			}));

		try {
			await importErdAsync({
				version: 1,
				erd: { id: docErdId, name: node?.name ?? "" },
				tables,
				relations,
			});
			setPicked(new Set());
			onChanged();
		} catch {
			// Импорт объясняет свои ошибки сам.
		}
	};

	const draw = async () => {
		setLinking(true);
		try {
			for (const relation of drawable) {
				await createRelationApi({
					fromEntity: idByName.get(fold(relation.fromTable)) as string,
					fromField: relation.fromColumn,
					toEntity: idByName.get(fold(relation.toTable)) as string,
					toField: relation.toColumn,
				});
			}
			toast({
				title: "Связи добавлены",
				description: `Нарисовано связей: ${drawable.length}`,
			});
			onChanged();
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось добавить связи",
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLinking(false);
		}
	};

	const nothing =
		onlyInDb.length === 0 && onlyInDoc.length === 0 && differs.length === 0;

	return (
		<aside className={s.panel}>
			<div className={s.head}>
				<p className={s.title}>
					Сравнение со схемой <span className={s.schema}>{diff.schema}</span>
				</p>
				<Button
					variant="subtle"
					size="sm"
					onClick={onRefresh}
					disabled={working}
				>
					{busy ? "Читаем…" : "Обновить"}
				</Button>
				<Button variant="ghost" size="sm" onClick={onClose} disabled={working}>
					Выйти
				</Button>
			</div>

			<div className={s.body}>
				<div className={s.legend}>
					<div className={s.legendRow}>
						<span className={`${s.swatch} ${s.inDb}`} />
						Есть в базе, но не описано — {diff.summary.tablesOnlyInDb} таблиц,{" "}
						{diff.summary.columnsOnlyInDb} колонок
					</div>
					<div className={s.legendRow}>
						<span className={`${s.swatch} ${s.inDoc}`} />
						Описано, но в базе не найдено — {diff.summary.tablesOnlyInDoc}{" "}
						таблиц, {diff.summary.columnsOnlyInDoc} колонок
					</div>
					<div className={s.legendRow}>
						<span className={`${s.swatch} ${s.differs}`} />
						Расходятся флаги — {diff.summary.columnsDiffer} колонок
					</div>
					<div className={s.legendRow}>
						<span className={`${s.swatch} ${s.same}`} />
						Совпадает
					</div>
				</div>

				{nothing && (
					<p className={s.empty}>
						Диаграмма и схема сходятся: ни лишних таблиц, ни недостающих
						колонок.
					</p>
				)}

				{onlyInDb.length > 0 && (
					<section className={s.section}>
						<div className={s.sectionHead}>
							Только в базе <span className={s.count}>{onlyInDb.length}</span>
						</div>
						<ul className={s.list}>
							{onlyInDb.map((table) => (
								<li key={table.name} className={s.item}>
									<Checkbox
										checked={picked.has(table.name)}
										onChange={() => toggle(table.name)}
									/>
									<span title={`Колонок: ${table.columns.length}`}>
										{table.name}
									</span>
								</li>
							))}
						</ul>
						<div className={s.actions}>
							<Button
								variant="subtle"
								size="sm"
								onClick={adopt}
								disabled={picked.size === 0 || working}
							>
								{isImportingErd
									? "Переносим…"
									: `Перенести в документ${picked.size ? ` (${picked.size})` : ""}`}
							</Button>
						</div>
					</section>
				)}

				{newRelations.length > 0 && (
					<section className={s.section}>
						<div className={s.sectionHead}>
							Связи только в базе{" "}
							<span className={s.count}>{newRelations.length}</span>
						</div>
						<ul className={s.list}>
							{newRelations.map((relation) => (
								<li
									key={`${relation.fromTable}.${relation.fromColumn}-${relation.toTable}.${relation.toColumn}`}
									className={s.item}
								>
									<span>
										{relation.fromTable}.{relation.fromColumn} →{" "}
										{relation.toTable}.{relation.toColumn}
									</span>
								</li>
							))}
						</ul>
						{drawable.length > 0 && (
							<div className={s.actions}>
								<Button
									variant="subtle"
									size="sm"
									onClick={draw}
									disabled={working}
								>
									{linking
										? "Рисуем…"
										: `Нарисовать готовые (${drawable.length})`}
								</Button>
							</div>
						)}
					</section>
				)}

				{onlyInDoc.length > 0 && (
					<section className={s.section}>
						<div className={s.sectionHead}>
							Только в документе{" "}
							<span className={s.count}>{onlyInDoc.length}</span>
						</div>
						<ul className={s.list}>
							{onlyInDoc.map((table) => (
								<li key={table.name} className={s.item}>
									<span>{table.name}</span>
								</li>
							))}
						</ul>
					</section>
				)}

				{differs.length > 0 && (
					<section className={s.section}>
						<div className={s.sectionHead}>
							Расхождения в колонках{" "}
							<span className={s.count}>{differs.length}</span>
						</div>
						{differs.map((table: TableDiff) => (
							<div key={table.name} className={s.table}>
								<div className={s.tableName}>{table.name}</div>
								{table.columns
									.filter((column) => column.status !== "same")
									.map((column) => (
										<div key={column.name} className={s.column}>
											<span className={s.sign}>{SIGN[column.status]}</span>
											<span>{column.name}</span>
											<span className={s.types}>{explain(column)}</span>
										</div>
									))}
							</div>
						))}
					</section>
				)}

				{diff.notices.length > 0 && (
					<ul className={s.notices}>
						{diff.notices.map((notice) => (
							<li key={notice.message}>{notice.message}</li>
						))}
					</ul>
				)}
			</div>
		</aside>
	);
};
