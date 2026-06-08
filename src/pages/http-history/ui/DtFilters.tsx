import { cx } from "@/shared/lib/cx";
import type { DataTableFilter } from "./DataTable";
import s from "./DataTable.module.css";

interface DtFiltersProps<T> {
	filters?: DataTableFilter<T>[];
	data: T[];
	activeFilter: string | null;
	onFilter: (id: string) => void;
}

/* ─── Filters + density ─── */
export function DtFilters<T>({
	filters,
	data,
	activeFilter,
	onFilter,
}: DtFiltersProps<T>) {
	return (
		<div className={s["dt-filters"]}>
			{filters?.map((f) => {
				const cnt = f.predicate ? data.filter(f.predicate).length : data.length;
				return (
					<button
						key={f.id}
						className={cx(s["dt-filter"], activeFilter === f.id && s.active)}
						onClick={() => onFilter(f.id)}
					>
						{f.label}
						<span className={s.cnt}>{cnt}</span>
					</button>
				);
			})}
		</div>
	);
}
