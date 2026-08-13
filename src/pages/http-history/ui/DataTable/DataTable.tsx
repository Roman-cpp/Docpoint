import {
	type ColumnDef,
	type FilterFn,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type RowData,
	type SortingFn,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { type ReactNode, useMemo, useState } from "react";
import { cx } from "@/shared/lib/cx";
import { ChevronLeftIcon, ChevronRightIcon } from "@/shared/svg";
import s from "../DataTable.module.css";
import { DtTable } from "../DtTable";

/* Per-column presentation hints carried through to the cell/header renderers. */
declare module "@tanstack/react-table" {
	interface ColumnMeta<TData extends RowData, TValue> {
		align?: "" | "num" | "center";
		mono?: boolean;
		truncate?: boolean;
	}
}

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
	entityName?: string;
	columns: DataTableColumn<T>[];
	data: T[];
	rowKey?: (row: T) => RowKey;
	/* Controlled search / filter state — owned by the parent (see {@link DtToolbar}). */
	search: string;
	activeFilter: string | null;
	searchKeys?: (keyof T & string)[];
	filters?: DataTableFilter<T>[];
	initialSort?: { key: string; dir: "asc" | "desc" } | null;
	selectable?: boolean;
	rowActions?: (row: T, api: DataTableApi) => ReactNode;
	bulkActions?: (ids: RowKey[], api: DataTableApi) => ReactNode;
	initialPageSize?: number;
	/**
	 * Server-side pagination. When provided, `data` is treated as a single,
	 * already-paginated page from the server and page/size changes are delegated
	 * to the parent instead of being handled client-side.
	 */
	serverPagination?: ServerPagination;
	onToast?: (msg: string, variant?: string) => void;
	onRowClick?: (row: T) => void;
	activeKey?: RowKey | null;
}

export interface ServerPagination {
	/** Current page index, 0-based. */
	pageIndex: number;
	/** Rows per page. */
	pageSize: number;
	/** Total number of pages reported by the server. */
	pageCount: number;
	/** Total number of rows across all pages. */
	total: number;
	onPageChange: (pageIndex: number) => void;
	onPageSizeChange: (pageSize: number) => void;
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
	columns,
	data,
	rowKey = (r: T) => (r as { id: RowKey }).id,
	search,
	activeFilter,
	searchKeys,
	filters,
	initialSort,
	selectable = false,
	rowActions,
	initialPageSize = 8,
	serverPagination,
	onToast,
	onRowClick,
	activeKey,
}: DataTableProps<T>) {
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
		// With server-side pagination `data` is already a single page, so the
		// client-side slicing row model is left out.
		...(serverPagination
			? { manualPagination: true, pageCount: serverPagination.pageCount }
			: { getPaginationRowModel: getPaginationRowModel() }),
	});

	const clearSel = () => table.resetRowSelection();

	const api: DataTableApi = {
		clearSel,
		toast: (m, v) => onToast?.(m, v),
	};

	// pagination / range readouts — sourced from the server when paginating
	// server-side, otherwise from tanstack's client-side state.
	const pageIndex = serverPagination
		? serverPagination.pageIndex
		: table.getState().pagination.pageIndex;
	const pageSize = serverPagination
		? serverPagination.pageSize
		: table.getState().pagination.pageSize;
	const total = serverPagination
		? serverPagination.total
		: table.getFilteredRowModel().rows.length;
	const pageCount = serverPagination
		? serverPagination.pageCount
		: table.getPageCount();
	const start = pageIndex * pageSize;

	const goToPage = (p: number) =>
		serverPagination ? serverPagination.onPageChange(p) : table.setPageIndex(p);
	const setPageSize = (n: number) =>
		serverPagination
			? serverPagination.onPageSizeChange(n)
			: table.setPageSize(n);
	const canPrev = serverPagination ? pageIndex > 0 : table.getCanPreviousPage();
	const canNext = serverPagination
		? pageIndex < pageCount - 1
		: table.getCanNextPage();

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
			{/* ─── Table ─── */}
			<DtTable
				table={table}
				template={template}
				selectable={selectable}
				rowActions={rowActions}
				onRowClick={onRowClick}
				activeKey={activeKey}
				rowKey={rowKey}
				api={api}
			/>

			{/* ─── Footer ─── */}
			<div className={s["dt-foot"]}>
				<div className={s["dt-foot-info"]}>
					<span>
						{total === 0
							? "Нет данных"
							: `Показано ${start + 1}–${Math.min(start + pageSize, total)} из ${total} запросов`}
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
							type="button"
							className={s["dt-pag-btn"]}
							disabled={!canPrev}
							onClick={() => goToPage(pageIndex - 1)}
							aria-label="Назад"
						>
							<ChevronLeftIcon size={12} />
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
									type="button"
									key={p}
									className={cx(
										s["dt-pag-btn"],
										p === pageIndex + 1 && s.active,
									)}
									onClick={() => goToPage(p - 1)}
								>
									{p}
								</button>
							),
						)}
						<button
							type="button"
							className={s["dt-pag-btn"]}
							disabled={!canNext}
							onClick={() => goToPage(pageIndex + 1)}
							aria-label="Вперёд"
						>
							<ChevronRightIcon size={12} />
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
