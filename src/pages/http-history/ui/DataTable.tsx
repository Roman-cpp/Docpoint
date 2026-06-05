import {
	type FC,
	type ReactNode,
	type SVGProps,
	useEffect,
	useMemo,
	useState,
} from "react";
import { cx } from "@/shared/lib/cx";
import s from "./DataTable.module.css";

/* ─── Icons (14×14, stroke 1.5 — matches Docpoint set) ─── */
const DtBase: FC<SVGProps<SVGSVGElement> & { size?: number }> = ({
	children,
	size = 14,
	...rest
}) => (
	<svg
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...rest}
	>
		{children}
	</svg>
);
const DtCheck: FC<{ size?: number }> = ({ size = 11 }) => (
	<DtBase size={size}>
		<path d="M2.5 7.5L5.5 10.5 11.5 4" />
	</DtBase>
);
const DtDash: FC<{ size?: number }> = ({ size = 11 }) => (
	<DtBase size={size}>
		<path d="M3 7h8" />
	</DtBase>
);
const DtCaret: FC<{ size?: number }> = ({ size = 11 }) => (
	<DtBase size={size}>
		<path d="M3.5 5.5L7 9l3.5-3.5" />
	</DtBase>
);
const DtSort: FC<{ size?: number }> = ({ size = 11 }) => (
	<DtBase size={size}>
		<path d="M4 5.5L7 2.5 10 5.5M4 8.5L7 11.5 10 8.5" />
	</DtBase>
);
const DtSearch: FC<{ size?: number }> = ({ size = 14 }) => (
	<DtBase size={size}>
		<circle cx="6" cy="6" r="4" />
		<path d="M9 9l3.5 3.5" />
	</DtBase>
);
const DtTrash: FC<{ size?: number }> = ({ size = 12 }) => (
	<DtBase size={size}>
		<path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M3.5 3.5l.5 9a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l.5-9M6 6v5M8 6v5" />
	</DtBase>
);
const DtExport: FC<{ size?: number }> = ({ size = 12 }) => (
	<DtBase size={size}>
		<path d="M7 1.5v8M3.5 6.5L7 10l3.5-3.5M2 12.5h10" />
	</DtBase>
);
const DtRows: FC<{ size?: number }> = ({ size = 14 }) => (
	<DtBase size={size}>
		<path d="M2 4h10M2 7h10M2 10h10" />
	</DtBase>
);
const DtRowsLg: FC<{ size?: number }> = ({ size = 14 }) => (
	<DtBase size={size}>
		<path d="M2 4.5h10M2 9.5h10" />
	</DtBase>
);
const DtChevL: FC<{ size?: number }> = ({ size = 12 }) => (
	<DtBase size={size}>
		<path d="M8.5 3.5L5 7l3.5 3.5" />
	</DtBase>
);
const DtChevR: FC<{ size?: number }> = ({ size = 12 }) => (
	<DtBase size={size}>
		<path d="M5.5 3.5L9 7l-3.5 3.5" />
	</DtBase>
);

/* ─── Checkbox ─── */
interface DtCheckboxProps {
	checked: boolean;
	indeterminate?: boolean;
	onChange: () => void;
	label: string;
}
const DtCheckbox: FC<DtCheckboxProps> = ({
	checked,
	indeterminate,
	onChange,
	label,
}) => {
	const cls = indeterminate ? s.indeterminate : checked ? s.checked : undefined;
	return (
		<button
			type="button"
			className={cx(s["dt-cb"], cls)}
			role="checkbox"
			aria-checked={indeterminate ? "mixed" : checked}
			aria-label={label}
			onClick={(e) => {
				e.stopPropagation();
				onChange();
			}}
		>
			{indeterminate ? <DtDash /> : checked ? <DtCheck /> : null}
		</button>
	);
};

/* ─── Build page-number list with ellipses ─── */
function pageList(page: number, count: number): (number | "…")[] {
	if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
	const out: (number | "…")[] = [1];
	const lo = Math.max(2, page - 1);
	const hi = Math.min(count - 1, page + 1);
	if (lo > 2) out.push("…");
	for (let p = lo; p <= hi; p++) out.push(p);
	if (hi < count - 1) out.push("…");
	out.push(count);
	return out;
}

/* ─── Types ─── */
export type RowKey = string | number;

export interface DataTableColumn<T> {
	key: string;
	header: string;
	width?: string;
	align?: "" | "num" | "center";
	sortable?: boolean;
	mono?: boolean;
	truncate?: boolean;
	sortValue?: (row: T) => string | number | null | undefined;
	render?: (row: T) => ReactNode;
}

export interface DataTableFilter<T> {
	id: string;
	label: string;
	predicate?: (row: T) => boolean;
}

export interface DataTableApi {
	clearSel: () => void;
	toast: (msg: string, variant?: string) => void;
}

interface DataTableProps<T> {
	title: string;
	subtitle?: string;
	entityName?: string;
	columns: DataTableColumn<T>[];
	data: T[];
	rowKey?: (row: T) => RowKey;
	searchKeys?: (keyof T & string)[];
	filters?: DataTableFilter<T>[];
	initialSort?: { key: string; dir: "asc" | "desc" } | null;
	selectable?: boolean;
	rowActions?: (row: T, api: DataTableApi) => ReactNode;
	bulkActions?: (ids: RowKey[], api: DataTableApi) => ReactNode;
	toolbarActions?: ReactNode;
	initialPageSize?: number;
	onToast?: (msg: string, variant?: string) => void;
	onRowClick?: (row: T) => void;
	activeKey?: RowKey | null;
}

/* ═══ DataTable — config-driven table for big lists ═══ */
export function DataTable<T>({
	title,
	subtitle,
	entityName = "записи",
	columns,
	data,
	rowKey = (r: T) => (r as { id: RowKey }).id,
	searchKeys,
	filters,
	initialSort,
	selectable = false,
	rowActions,
	bulkActions,
	toolbarActions,
	initialPageSize = 8,
	onToast,
	onRowClick,
	activeKey,
}: DataTableProps<T>) {
	const [search, setSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState(
		filters ? filters[0].id : null,
	);
	const [sort, setSort] = useState(initialSort || null);
	const [selected, setSelected] = useState<Set<RowKey>>(() => new Set());
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [compact, setCompact] = useState(false);

	// Reset to first page whenever the result set changes shape
	// biome-ignore lint/correctness/useExhaustiveDependencies: page reset is intentional on filter/search/size change
	useEffect(() => {
		setPage(1);
	}, [search, activeFilter, pageSize]);

	const colByKey = useMemo(
		() => Object.fromEntries(columns.map((c) => [c.key, c])),
		[columns],
	);

	// 1 · filter chip
	const filterFn = filters?.find((f) => f.id === activeFilter)?.predicate;
	// 2 · search
	const q = search.trim().toLowerCase();
	const searched = useMemo(() => {
		let rows = data;
		if (filterFn) rows = rows.filter(filterFn);
		if (q && searchKeys) {
			rows = rows.filter((r) =>
				searchKeys.some((k) =>
					String(r[k] ?? "")
						.toLowerCase()
						.includes(q),
				),
			);
		}
		return rows;
	}, [data, filterFn, q, searchKeys]);

	// 3 · sort
	const sorted = useMemo(() => {
		if (!sort) return searched;
		const col = colByKey[sort.key];
		const get =
			col?.sortValue || ((r: T) => (r as Record<string, unknown>)[sort.key]);
		const dir = sort.dir === "desc" ? -1 : 1;
		return [...searched].sort((a, b) => {
			const va = get(a);
			const vb = get(b);
			if (va == null) return 1;
			if (vb == null) return -1;
			if (typeof va === "number" && typeof vb === "number")
				return (va - vb) * dir;
			return String(va).localeCompare(String(vb), "ru") * dir;
		});
	}, [searched, sort, colByKey]);

	// 4 · paginate
	const total = sorted.length;
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const safePage = Math.min(page, pageCount);
	const start = (safePage - 1) * pageSize;
	const pageRows = sorted.slice(start, start + pageSize);

	// selection helpers (operate over the full filtered set)
	const allKeys = sorted.map(rowKey);
	const selCount = selected.size;
	const allSel = selCount > 0 && allKeys.every((k) => selected.has(k));
	const someSel = selCount > 0 && !allSel;
	const toggleAll = () => setSelected(allSel ? new Set() : new Set(allKeys));
	const toggleOne = (k: RowKey) =>
		setSelected((prev) => {
			const n = new Set(prev);
			if (n.has(k)) n.delete(k);
			else n.add(k);
			return n;
		});
	const clearSel = () => setSelected(new Set());

	const onSort = (col: DataTableColumn<T>) => {
		if (!col.sortable) return;
		setSort((prev) => {
			if (!prev || prev.key !== col.key) return { key: col.key, dir: "asc" };
			if (prev.dir === "asc") return { key: col.key, dir: "desc" };
			return null;
		});
	};

	const api: DataTableApi = {
		clearSel,
		toast: (m, v) => onToast?.(m, v),
	};

	// grid template — selection col + data cols + actions col
	const template = [
		selectable && "34px",
		...columns.map((c) => c.width || "1fr"),
		rowActions && "minmax(72px, auto)",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div>
			{/* ─── Toolbar ─── */}
			<div className={s["dt-toolbar"]}>
				<div>
					<h1 className={s["dt-title"]}>
						{title}
						<span className={s["dt-title-count"]}>· {data.length}</span>
					</h1>
					{subtitle && <p className={s["dt-sub"]}>{subtitle}</p>}
				</div>
				<div className={s["dt-tools"]}>
					{searchKeys && (
						<div className={s["dt-search"]}>
							<DtSearch />
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Поиск…"
							/>
						</div>
					)}
					{toolbarActions}
				</div>
			</div>

			{/* ─── Filters + density ─── */}
			<div className={s["dt-filters"]}>
				{filters?.map((f) => {
					const cnt = f.predicate
						? data.filter(f.predicate).length
						: data.length;
					return (
						<button
							key={f.id}
							className={cx(s["dt-filter"], activeFilter === f.id && s.active)}
							onClick={() => setActiveFilter(f.id)}
						>
							{f.label}
							<span className={s.cnt}>{cnt}</span>
						</button>
					);
				})}
				<div className={s["dt-filters-right"]}>
					<div
						className={s["dt-density"]}
						role="group"
						aria-label="Плотность строк"
					>
						<button
							className={cx(!compact && s.active)}
							onClick={() => setCompact(false)}
							title="Просторно"
							aria-label="Просторно"
						>
							<DtRowsLg />
						</button>
						<button
							className={cx(compact && s.active)}
							onClick={() => setCompact(true)}
							title="Плотно"
							aria-label="Плотно"
						>
							<DtRows />
						</button>
					</div>
				</div>
			</div>

			{/* ─── Table ─── */}
			<div className={cx(s["dt-table"], compact && s.compact)}>
				{/* Header OR selection bar */}
				{selCount > 0 ? (
					<div className={s["dt-selbar"]}>
						<span className={s["dt-selbar-count"]}>
							{selectable && (
								<DtCheckbox
									checked={allSel}
									indeterminate={someSel}
									onChange={toggleAll}
									label="Снять выделение"
								/>
							)}
							Выбрано {selCount}
						</span>
						<button className={s["dt-selbar-clear"]} onClick={clearSel}>
							Сбросить
						</button>
						<div className={s["dt-selbar-actions"]}>
							{bulkActions ? (
								bulkActions([...selected], api)
							) : (
								<>
									<button className={s["dt-selbar-btn"]}>
										<DtExport /> Экспорт
									</button>
									<button
										className={cx(s["dt-selbar-btn"], s.danger)}
										onClick={() => {
											onToast?.(`Удалено: ${selCount}`, "danger");
											clearSel();
										}}
									>
										<DtTrash size={11} /> Удалить
									</button>
								</>
							)}
						</div>
					</div>
				) : (
					<div
						className={s["dt-head"]}
						style={{ gridTemplateColumns: template }}
					>
						{selectable && (
							<DtCheckbox
								checked={false}
								indeterminate={false}
								onChange={toggleAll}
								label="Выбрать все"
							/>
						)}
						{columns.map((c) => {
							const isSorted = sort && sort.key === c.key;
							return (
								<span
									key={c.key}
									className={cx(
										s["dt-th"],
										c.align && s[c.align],
										c.sortable && s.sortable,
										isSorted && s.sorted,
										isSorted && sort?.dir === "desc" && s.desc,
									)}
									onClick={() => onSort(c)}
								>
									{c.header}
									{c.sortable && (
										<span className={s["dt-sort-ico"]}>
											{isSorted ? <DtCaret /> : <DtSort />}
										</span>
									)}
								</span>
							);
						})}
						{rowActions && <span className={cx(s["dt-th"], s.num)} />}
					</div>
				)}

				{/* Rows */}
				{pageRows.map((row) => {
					const k = rowKey(row);
					const isSel = selected.has(k);
					const isActive = activeKey != null && activeKey === k;
					return (
						<div
							key={k}
							className={cx(
								s["dt-row"],
								isSel && s.selected,
								isActive && s.active,
								onRowClick && s.clickable,
							)}
							tabIndex={0}
							style={{ gridTemplateColumns: template }}
							onClick={onRowClick ? () => onRowClick(row) : undefined}
							onKeyDown={
								onRowClick
									? (e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onRowClick(row);
											}
										}
									: undefined
							}
						>
							{selectable && (
								<DtCheckbox
									checked={isSel}
									onChange={() => toggleOne(k)}
									label="Выбрать строку"
								/>
							)}
							{columns.map((c) => (
								<div
									key={c.key}
									className={cx(
										s["dt-cell"],
										c.align === "num" && s["dt-num"],
										c.mono && s["dt-mono"],
										c.truncate && s["dt-truncate"],
									)}
								>
									{c.render
										? c.render(row)
										: (row as Record<string, ReactNode>)[c.key]}
								</div>
							))}
							{rowActions && (
								<div className={s["dt-row-actions"]}>
									{rowActions(row, api)}
								</div>
							)}
						</div>
					);
				})}

				{/* Empty */}
				{pageRows.length === 0 && (
					<div className={s["dt-empty"]}>
						<div className={s["dt-empty-ico"]}>
							<DtSearch size={16} />
						</div>
						<p className={s["dt-empty-title"]}>Ничего не найдено</p>
						<p className={s["dt-empty-text"]}>
							Попробуйте изменить запрос или сбросить фильтры.
						</p>
					</div>
				)}
			</div>

			{/* ─── Footer ─── */}
			<div className={s["dt-foot"]}>
				<div className={s["dt-foot-info"]}>
					<span>
						{total === 0
							? "Нет данных"
							: `Показано ${start + 1}–${Math.min(start + pageSize, total)} из ${total} ${entityName}`}
					</span>
					<span className={s["dt-pagesize"]}>
						На странице
						<select
							value={pageSize}
							onChange={(e) => setPageSize(Number(e.target.value))}
						>
							{[8, 12, 25, 50].map((n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</select>
					</span>
				</div>
				{pageCount > 1 && (
					<div className={s["dt-pag"]}>
						<button
							className={s["dt-pag-btn"]}
							disabled={safePage === 1}
							onClick={() => setPage(safePage - 1)}
							aria-label="Назад"
						>
							<DtChevL />
						</button>
						{pageList(safePage, pageCount).map((p, i) =>
							p === "…" ? (
								<span key={`e${i}`} className={s["dt-pag-ellipsis"]}>
									…
								</span>
							) : (
								<button
									key={p}
									className={cx(s["dt-pag-btn"], p === safePage && s.active)}
									onClick={() => setPage(p)}
								>
									{p}
								</button>
							),
						)}
						<button
							className={s["dt-pag-btn"]}
							disabled={safePage === pageCount}
							onClick={() => setPage(safePage + 1)}
							aria-label="Вперёд"
						>
							<DtChevR />
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
