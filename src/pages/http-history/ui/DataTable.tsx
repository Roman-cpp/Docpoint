import {
	type ColumnDef,
	type FilterFn,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type RowData,
	type SortingFn,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	type FC,
	type ReactNode,
	type SVGProps,
	useMemo,
	useState,
} from "react";
import { cx } from "@/shared/lib/cx";
import s from "./DataTable.module.css";
import { DtFilters } from "./DtFilters";

/* Per-column presentation hints carried through to the cell/header renderers. */
declare module "@tanstack/react-table" {
	interface ColumnMeta<TData extends RowData, TValue> {
		align?: "" | "num" | "center";
		mono?: boolean;
		truncate?: boolean;
	}
}

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

/* Combined chip-predicate + free-text search, run by tanstack as a global filter. */
interface GlobalFilter<T> {
	search: string;
	filterId: string | null;
	filters?: DataTableFilter<T>[];
	searchKeys?: (keyof T & string)[];
}

/* "ru"-aware comparator; tanstack inverts the result for descending sort. */
const localeSortingFn: SortingFn<unknown> = (a, b, columnId) => {
	const va = a.getValue(columnId);
	const vb = b.getValue(columnId);
	if (va == null) return vb == null ? 0 : 1;
	if (vb == null) return -1;
	if (typeof va === "number" && typeof vb === "number") return va - vb;
	return String(va).localeCompare(String(vb), "ru");
};

const globalFilterFn: FilterFn<unknown> = (row, _columnId, value) => {
	const { search, filterId, filters, searchKeys } =
		value as GlobalFilter<unknown>;
	const predicate = filters?.find((f) => f.id === filterId)?.predicate;
	if (predicate && !predicate(row.original)) return false;
	const q = search.trim().toLowerCase();
	if (q && searchKeys) {
		return searchKeys.some((k) =>
			String((row.original as Record<string, unknown>)[k] ?? "")
				.toLowerCase()
				.includes(q),
		);
	}
	return true;
};

/* ═══ DataTable — config-driven table for big lists (built on @tanstack/react-table) ═══ */
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
	const [sorting, setSorting] = useState<SortingState>(
		initialSort
			? [{ id: initialSort.key, desc: initialSort.dir === "desc" }]
			: [],
	);
	const [rowSelection, setRowSelection] = useState({});

	// Translate the column config into tanstack column defs.
	const tableColumns = useMemo<ColumnDef<T>[]>(
		() =>
			columns.map((c) => ({
				id: c.key,
				accessorFn:
					c.sortValue ?? ((row) => (row as Record<string, unknown>)[c.key]),
				header: c.header,
				enableSorting: !!c.sortable,
				sortingFn: localeSortingFn as SortingFn<T>,
				cell: ({ row }) =>
					c.render
						? c.render(row.original)
						: (row.original as Record<string, ReactNode>)[c.key],
				meta: { align: c.align, mono: c.mono, truncate: c.truncate },
			})),
		[columns],
	);

	const globalFilter = useMemo<GlobalFilter<T>>(
		() => ({ search, filterId: activeFilter, filters, searchKeys }),
		[search, activeFilter, filters, searchKeys],
	);

	const table = useReactTable<T>({
		data,
		columns: tableColumns,
		state: { sorting, rowSelection, globalFilter },
		initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
		enableRowSelection: selectable,
		getRowId: (row) => String(rowKey(row)),
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		globalFilterFn: globalFilterFn as FilterFn<T>,
		getColumnCanGlobalFilter: () => true,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	const clearSel = () => table.resetRowSelection();
	const selectedRows = table.getSelectedRowModel().rows;
	const selCount = selectedRows.length;
	const allSel = table.getIsAllRowsSelected();
	const someSel = table.getIsSomeRowsSelected();

	const api: DataTableApi = {
		clearSel,
		toast: (m, v) => onToast?.(m, v),
	};

	// pagination / range readouts
	const { pageIndex, pageSize } = table.getState().pagination;
	const total = table.getFilteredRowModel().rows.length;
	const pageCount = table.getPageCount();
	const start = pageIndex * pageSize;
	const pageRows = table.getRowModel().rows;

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
			<DtFilters
				filters={filters}
				data={data}
				activeFilter={activeFilter}
				onFilter={setActiveFilter}
			/>

			{/* ─── Table ─── */}
			<div className={cx(s["dt-table"], s.compact)}>
				{/* Header OR selection bar */}
				{selCount > 0 ? (
					<div className={s["dt-selbar"]}>
						<span className={s["dt-selbar-count"]}>
							{selectable && (
								<DtCheckbox
									checked={allSel}
									indeterminate={someSel}
									onChange={() => table.toggleAllRowsSelected()}
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
								bulkActions(
									selectedRows.map((r) => rowKey(r.original)),
									api,
								)
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
								onChange={() => table.toggleAllRowsSelected()}
								label="Выбрать все"
							/>
						)}
						{table.getHeaderGroups()[0].headers.map((header) => {
							const col = header.column;
							const meta = col.columnDef.meta;
							const sortDir = col.getIsSorted();
							const canSort = col.getCanSort();
							return (
								<span
									key={header.id}
									className={cx(
										s["dt-th"],
										meta?.align && s[meta.align],
										canSort && s.sortable,
										sortDir && s.sorted,
										sortDir === "desc" && s.desc,
									)}
									onClick={col.getToggleSortingHandler()}
								>
									{flexRender(col.columnDef.header, header.getContext())}
									{canSort && (
										<span className={s["dt-sort-ico"]}>
											{sortDir ? <DtCaret /> : <DtSort />}
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
					const k = rowKey(row.original);
					const isSel = row.getIsSelected();
					const isActive = activeKey != null && activeKey === k;
					return (
						<div
							key={row.id}
							className={cx(
								s["dt-row"],
								isSel && s.selected,
								isActive && s.active,
								onRowClick && s.clickable,
							)}
							tabIndex={0}
							style={{ gridTemplateColumns: template }}
							onClick={onRowClick ? () => onRowClick(row.original) : undefined}
							onKeyDown={
								onRowClick
									? (e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onRowClick(row.original);
											}
										}
									: undefined
							}
						>
							{selectable && (
								<DtCheckbox
									checked={isSel}
									onChange={() => row.toggleSelected()}
									label="Выбрать строку"
								/>
							)}
							{row.getVisibleCells().map((cell) => {
								const meta = cell.column.columnDef.meta;
								return (
									<div
										key={cell.id}
										className={cx(
											s["dt-cell"],
											meta?.align === "num" && s["dt-num"],
											meta?.mono && s["dt-mono"],
											meta?.truncate && s["dt-truncate"],
										)}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</div>
								);
							})}
							{rowActions && (
								<div className={s["dt-row-actions"]}>
									{rowActions(row.original, api)}
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
							onChange={(e) => table.setPageSize(Number(e.target.value))}
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
							disabled={!table.getCanPreviousPage()}
							onClick={() => table.previousPage()}
							aria-label="Назад"
						>
							<DtChevL />
						</button>
						{pageList(pageIndex + 1, pageCount).map((p, i, arr) =>
							p === "…" ? (
								<span
									key={i < arr.length / 2 ? "ellipsis-lead" : "ellipsis-trail"}
									className={s["dt-pag-ellipsis"]}
								>
									…
								</span>
							) : (
								<button
									key={p}
									className={cx(
										s["dt-pag-btn"],
										p === pageIndex + 1 && s.active,
									)}
									onClick={() => table.setPageIndex(p - 1)}
								>
									{p}
								</button>
							),
						)}
						<button
							className={s["dt-pag-btn"]}
							disabled={!table.getCanNextPage()}
							onClick={() => table.nextPage()}
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
