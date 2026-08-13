import type { ReactNode } from "react";
import { SearchIcon } from "@/shared/svg";
import type { DataTableFilter } from "../DataTable";
import s from "../DataTable.module.css";
import { DtFilters } from "../DtFilters";

interface DtToolbarProps<T> {
	title: string;
	subtitle?: string;
	data: T[];
	searchKeys?: (keyof T & string)[];
	search: string;
	onSearch: (value: string) => void;
	toolbarActions?: ReactNode;
	filters?: DataTableFilter<T>[];
	activeFilter: string | null;
	onFilter: (id: string) => void;
}

/* ═══ DtToolbar — title, search and filter chips for {@link DataTable} ═══ */
export function DtToolbar<T>({
	title,
	subtitle,
	data,
	searchKeys,
	search,
	onSearch,
	toolbarActions,
	filters,
	activeFilter,
	onFilter,
}: DtToolbarProps<T>) {
	return (
		<>
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
							<SearchIcon />
							<input
								value={search}
								onChange={(e) => onSearch(e.target.value)}
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
				activeFilter={activeFilter}
				onFilter={onFilter}
			/>
		</>
	);
}
