import { flexRender, type Table } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import type { DataTableApi, RowKey } from "../DataTable";
import s from "../DataTable.module.css";
import { DtCaret, DtCheckbox, DtSearch, DtSort } from "../DtIcons";

interface DtTableProps<T> {
	table: Table<T>;
	/* Inline `grid-template-columns` shared by the header and every row. */
	template: string;
	selectable: boolean;
	rowActions?: (row: T, api: DataTableApi) => ReactNode;
	onRowClick?: (row: T) => void;
	activeKey?: RowKey | null;
	rowKey: (row: T) => RowKey;
	api: DataTableApi;
}

/* ═══ DtTable — header + rows + empty state for {@link DataTable} ═══ */
export function DtTable<T>({
	table,
	template,
	selectable,
	rowActions,
	onRowClick,
	activeKey,
	rowKey,
	api,
}: DtTableProps<T>) {
	const pageRows = table.getRowModel().rows;

	return (
		<div className={cx(s["dt-table"], s.compact)}>
			{/* Header */}
			{table.getHeaderGroups().map((hg) => (
				<div
					key={hg.id}
					className={s["dt-head"]}
					style={{ gridTemplateColumns: template }}
				>
					{selectable && (
						<DtCheckbox
							checked={table.getIsAllRowsSelected()}
							indeterminate={table.getIsSomeRowsSelected()}
							onChange={() => table.toggleAllRowsSelected()}
							label="Выбрать все строки"
						/>
					)}
					{hg.headers.map((header) => {
						const meta = header.column.columnDef.meta;
						const canSort = header.column.getCanSort();
						const sorted = header.column.getIsSorted();
						const toggleSort = header.column.getToggleSortingHandler();
						return (
							<div
								key={header.id}
								className={cx(
									s["dt-th"],
									meta?.align === "num" && s.num,
									meta?.align === "center" && s.center,
									canSort && s.sortable,
									sorted && s.sorted,
									sorted === "desc" && s.desc,
								)}
								role={canSort ? "button" : undefined}
								tabIndex={canSort ? 0 : undefined}
								onClick={canSort ? toggleSort : undefined}
								onKeyDown={
									canSort
										? (e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													toggleSort?.(e);
												}
											}
										: undefined
								}
							>
								{flexRender(
									header.column.columnDef.header,
									header.getContext(),
								)}
								{canSort && (
									<span className={s["dt-sort-ico"]}>
										{sorted ? <DtCaret /> : <DtSort />}
									</span>
								)}
							</div>
						);
					})}
					{rowActions && <div className={s["dt-th"]} />}
				</div>
			))}

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
	);
}
