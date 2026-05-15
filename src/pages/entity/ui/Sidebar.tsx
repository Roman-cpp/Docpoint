import type { FC } from "react";
import type { Entity } from "@/entities/entity";
import s from "./ApiSchemasPage.module.css";
import { actionSelectEntity, selectSelectedEntity, useDocaStore } from "@/features/doca";

interface SidebarProps {
	filtered: Entity[];
	search: string;
	onSearch: (value: string) => void;
}

export const Sidebar: FC<SidebarProps> = ({
	filtered,
	search,
	onSearch,
}) => {

  const selectEntity = useDocaStore(actionSelectEntity);
  const activeEntity = useDocaStore(selectSelectedEntity);

  return (
	<div className={s.sidebar}>
		<div className={s.sidebarSearch}>
			<div className={s.searchWrap}>
				<svg
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
				>
					<circle cx="5" cy="5" r="3.5" />
					<path d="M8 8l2.5 2.5" />
				</svg>
				<input
					className={s.searchInput}
					placeholder="Search schemas…"
					value={search}
					onChange={(e) => onSearch(e.target.value)}
				/>
			</div>
		</div>
		<div className={s.sidebarScroll}>
			<div className={s.sidebarSectionLabel}>Entities · Core API</div>
			{filtered.map((entity) => (
				<button
					key={entity.id}
					className={`${s.entityItem}${activeEntity?.id === entity.id ? " " + s.entityItemActive : ""}`}
					onClick={() => selectEntity(entity.id)}
				>
					<div className={s.entityItemIcon}>
						{/* <img src={entity.icon} alt={entity.name} height={30} width={30} /> */}
					</div>
					<div className={s.entityItemInfo}>
						<div className={s.entityItemName}>{entity.name}</div>
					</div>
				</button>
			))}
			{filtered.length === 0 && (
				<div
					style={{
						padding: "20px 16px",
						fontSize: 12,
						color: "var(--ink-low)",
						textAlign: "center",
					}}
				>
					No results
				</div>
			)}
		</div>
	</div>
);
}
