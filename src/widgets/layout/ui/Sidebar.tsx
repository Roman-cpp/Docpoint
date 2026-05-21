import { useState } from "react";
import s from "@/shared/styles/apiDocs.module.css";
import {
  selectDoc,
	selectGroups,
	selectSelectedEndpoint,
	useDocStore,
} from "@/features/doc";
import { Link, useMatch } from "react-router";

const METHOD_STYLES: Record<string, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
};

export const Sidebar = () => {
  const doc = useDocStore(selectDoc);
	const groups = useDocStore(selectGroups);
	const selectedEndpoint = useDocStore(selectSelectedEndpoint);
	const isOverviewActive = !!useMatch("/doc-show/:id");
	const [search, setSearch] = useState("");
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

	if (!groups) return;

	return (
		<div className={s.sidebar}>
			<div className={s.sidebarSearch}>
				<div className={s.searchInputWrap}>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
					>
						<circle cx="6.5" cy="6.5" r="4.5" />
						<path d="M10 10l3.5 3.5" />
					</svg>
					<input
						className={s.searchInput}
						placeholder="Search endpoints…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
			</div>

			<div className={s.sidebarScroll}>
				<div style={{ padding: "4px 8px 2px" }}>
					<Link
						to={`/doc-show/${doc?.id}`}
						className={`${s.sidebarItem} ${isOverviewActive ? s.active : ""}`}
					>
						<span
							style={{
								width: "44px",
								display: "flex",
								justifyContent: "center",
							}}
						>
							<svg
								width="13"
								height="13"
								viewBox="0 0 13 13"
								fill="none"
								stroke="var(--ink-low)"
								strokeWidth="1.5"
								strokeLinecap="round"
							>
								<rect x="1" y="1" width="4.5" height="4.5" rx="1" />
								<rect x="7.5" y="1" width="4.5" height="4.5" rx="1" />
								<rect x="1" y="7.5" width="4.5" height="4.5" rx="1" />
								<rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" />
							</svg>
						</span>
						<span
							className={s.sidebarItemName}
							style={{ fontFamily: "var(--font-sans)", fontSize: "13px" }}
						>
							Overview
						</span>
					</Link>
				</div>

				{groups.map((group) => {
					const isOpen = !collapsed[group.id];
					return (
						<div className={s.sidebarGroup} key={group.id}>
							<div
								className={s.sidebarGroupHeader}
								onClick={() =>
									setCollapsed((prev) => ({
										...prev,
										[group.id]: !prev[group.id],
									}))
								}
							>
								<span className={s.sidebarGroupLabel}>{group.label}</span>
								<svg
									className={`${s.sidebarGroupChevron} ${isOpen ? s.open : ""}`}
									viewBox="0 0 12 12"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
								>
									<path d="M3 4.5l3 3 3-3" />
								</svg>
							</div>
							{isOpen && (
								<div className={s.sidebarItems}>
									{group.endpoints.map((ep) => {
										const ms = METHOD_STYLES[ep.method];
										return (
											<Link
												key={ep.id}
												to={`/endpoint-show/${ep.id}`}
												className={`${s.sidebarItem} ${selectedEndpoint?.id === ep.id ? s.active : ""}`}
											>
												<span
													className={s.sidebarItemMethod}
													style={{ color: ms.color, background: ms.bg }}
												>
													{ep.method}
												</span>
												<span className={s.sidebarItemName}>{ep.path}</span>
											</Link>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};
