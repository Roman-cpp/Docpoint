import { cx } from "@/shared/lib/cx";
import type { DataTableFilter } from "../DataTable";
import s from "../DataTable.module.css";

interface DtFiltersProps<T> {
	filters?: DataTableFilter<T>[];
	activeFilter: string | null;
	onFilter: (id: string) => void;
}

/* ─── Filters + density ─── */
export function DtFilters<T>({
	filters,
	activeFilter,
	onFilter,
}: DtFiltersProps<T>) {
	return (
		<div className={s["dt-filters"]}>
			{filters?.map((f) => {
				return (
					<button
						key={f.id}
						className={cx(s["dt-filter"], activeFilter === f.id && s.active)}
						onClick={() => onFilter(f.id)}
						type="button"
					>
						{f.label}
					</button>
				);
			})}
		</div>
	);
}
