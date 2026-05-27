import {
	Fragment,
	useState,
	useEffect,
	useMemo,
	type CSSProperties,
	type ReactNode,
} from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getPaginationRowModel,
	flexRender,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table";
import s from "./DataTable.module.css";

/* ─── Public types ────────────────────────────────────────────── */

export type SortDir = "asc" | "desc";
export type SortCriterion = { key: string; dir: SortDir };

export type DataTableColumn<T> = {
	label: string;
	/** If provided, column becomes sortable */
	sortKey?: string;
	render: (item: T) => ReactNode;
	/** CSS grid track size, e.g. "1.6fr", "120px". Default: "1fr" */
	width?: string;
};

type DataTableProps<T extends object> = {
	columns: DataTableColumn<T>[];
	data: T[];
	getRowKey: (item: T) => string | number;
	pageSize?: number;
	/** Controlled sort state */
	sortCriteria?: SortCriterion[];
	/** Called when user clicks a sortable column */
	onSortChange?: (criteria: SortCriterion[]) => void;
	/** Rendered in a fixed 36px column at the row end */
	renderRowActions?: (item: T) => ReactNode;
	/** Change to reset page to 1 */
	pageResetKey?: unknown;
	className?: string;
};

/* ─── Icons ──────────────────────────────────────────────────── */

const SortIcon = ({ dir }: { dir: "asc" | "desc" | null }) => (
	<svg
		width="10" height="12" viewBox="0 0 10 12"
		fill="none" stroke="currentColor" strokeWidth="1.7"
		strokeLinecap="round" strokeLinejoin="round" aria-hidden
	>
		<path d="M2 4.5L5 1.5L8 4.5" className={dir === "asc"  ? s.sortArrowActive : s.sortArrow} />
		<path d="M2 7.5L5 10.5L8 7.5" className={dir === "desc" ? s.sortArrowActive : s.sortArrow} />
	</svg>
);

const ChevronLeftIcon = () => (
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
		<title>prev</title><path d="M9 11L5 7l4-4" />
	</svg>
);

const ChevronRightIcon = () => (
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
		<title>next</title><path d="M5 3l4 4-4 4" />
	</svg>
);

/* ─── Helpers ─────────────────────────────────────────────────── */

function toTanstack(criteria: SortCriterion[]): SortingState {
	return criteria.map(({ key, dir }) => ({ id: key, desc: dir === "desc" }));
}

function fromTanstack(state: SortingState): SortCriterion[] {
	return state.map(({ id, desc }) => ({ key: id, dir: desc ? "desc" : "asc" }));
}

/* ─── Component ──────────────────────────────────────────────── */

export function DataTable<T extends object>({
	columns,
	data,
	getRowKey,
	pageSize = 10,
	sortCriteria,
	onSortChange,
	renderRowActions,
	pageResetKey,
	className,
}: DataTableProps<T>) {
	const isControlled = sortCriteria !== undefined;

	const [internalSorting, setInternalSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

	const sorting: SortingState = isControlled
		? toTanstack(sortCriteria)
		: internalSorting;

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional
	useEffect(() => {
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, [pageResetKey]);

	const tanstackColumns = useMemo<ColumnDef<T>[]>(() => {
		const cols: ColumnDef<T>[] = columns.map((col) => ({
			id: col.sortKey ?? col.label,
			header: col.label,
			enableSorting: !!col.sortKey,
			accessorFn: col.sortKey
				? (row) => (row as Record<string, unknown>)[col.sortKey!]
				: () => null,
			cell: ({ row }) => col.render(row.original),
		}));

		if (renderRowActions) {
			cols.push({
				id: "__actions",
				header: "",
				enableSorting: false,
				cell: ({ row }) => renderRowActions(row.original),
			});
		}

		return cols;
	}, [columns, renderRowActions]);

	const table = useReactTable({
		data,
		columns: tanstackColumns,
		getRowId: (row) => String(getRowKey(row)),
		state: { sorting, pagination },
		onSortingChange: (updater) => {
			const next = typeof updater === "function" ? updater(sorting) : updater;
			if (isControlled) {
				onSortChange?.(fromTanstack(next));
			} else {
				setInternalSorting(next);
			}
			setPagination((p) => ({ ...p, pageIndex: 0 }));
		},
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		enableMultiSort: true,
		isMultiSortEvent: (e) => (e as MouseEvent).shiftKey,
	});

	const isMultiSort = sorting.length > 1;
	const { pageIndex } = table.getState().pagination;
	const totalRows = data.length;
	const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
	const to = Math.min((pageIndex + 1) * pageSize, totalRows);

	const gridCols = [
		...columns.map((c) => c.width ?? "1fr"),
		...(renderRowActions ? ["36px"] : []),
	].join(" ");

	const tableStyle = { "--dt-cols": gridCols } as CSSProperties;

	return (
		<div className={s.wrapper}>
			{isMultiSort && (
				<div className={s.sortHint}>
					Сортировка по {sorting.length} параметрам — Shift+клик по колонке, чтобы добавить/убрать уровень
				</div>
			)}

			<div className={[s.table, className].filter(Boolean).join(" ")} style={tableStyle}>
				{/* Header */}
				<div className={s.tableHead}>
					{table.getFlatHeaders().map((header) => {
						if (!header.column.getCanSort()) {
							return (
								<span key={header.id} className={s.thStatic}>
									{flexRender(header.column.columnDef.header, header.getContext())}
								</span>
							);
						}
						const sorted = header.column.getIsSorted();
						const priority = header.column.getSortIndex() + 1;
						return (
							<button
								key={header.id}
								type="button"
								className={[s.thBtn, sorted ? s.thBtnActive : ""].filter(Boolean).join(" ")}
								onClick={header.column.getToggleSortingHandler()}
								title={sorted ? "Shift+клик: убрать из сортировки" : "Shift+клик: добавить к сортировке"}
							>
								{flexRender(header.column.columnDef.header, header.getContext())}
								<span className={s.sortIconWrap}>
									{isMultiSort && sorted && (
										<span className={s.sortPriority}>{priority}</span>
									)}
									<SortIcon dir={sorted || null} />
								</span>
							</button>
						);
					})}
				</div>

				{/* Rows */}
				<div className={s.tableBody}>
					{table.getRowModel().rows.map((row) => (
						<div key={row.id} className={s.tableRow}>
							{row.getVisibleCells().map((cell) => (
								<Fragment key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</Fragment>
							))}
						</div>
					))}
				</div>

				{/* Pagination */}
				<div className={s.pagination}>
					<span className={s.paginationInfo}>
						{totalRows === 0 ? "Нет результатов" : `${from}–${to} из ${totalRows}`}
					</span>
					<div className={s.paginationControls}>
						<button
							type="button"
							className={s.pageBtn}
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							aria-label="Предыдущая страница"
						>
							<ChevronLeftIcon />
						</button>
						{Array.from({ length: table.getPageCount() }, (_, i) => i).map((n) => (
							<button
								key={n}
								type="button"
								className={[s.pageBtn, n === pageIndex ? s.pageBtnActive : ""].filter(Boolean).join(" ")}
								onClick={() => table.setPageIndex(n)}
							>
								{n + 1}
							</button>
						))}
						<button
							type="button"
							className={s.pageBtn}
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
							aria-label="Следующая страница"
						>
							<ChevronRightIcon />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
