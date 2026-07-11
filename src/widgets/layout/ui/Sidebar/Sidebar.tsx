import { useState } from "react";
import { Link, useMatch } from "react-router";
import {
	actionAddEndpoint,
	DeleteGroupModal,
	selectDocApi,
	selectGroups,
	selectSelectedEndpoint,
	useDocApiStore,
} from "@/features/doc-api";
import s from "@/shared/styles/apiDocs.module.css";
import { AddEndpointModal } from "../AddEndpointModal";

const METHOD_STYLES: Record<string, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
};

export const Sidebar = () => {
	const doc = useDocApiStore(selectDocApi);
	const groups = useDocApiStore(selectGroups);
	const selectedEndpoint = useDocApiStore(selectSelectedEndpoint);
	const addEndpoint = useDocApiStore(actionAddEndpoint);
	const isOverviewActive = !!useMatch("/doc-show/:id");
	const [search, setSearch] = useState("");
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
	const [addOpen, setAddOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [groupToDelete, setGroupToDelete] = useState<{
		id: string;
		label: string;
	} | null>(null);

	if (!groups) return;

	const handleCreate = async (args: Parameters<typeof addEndpoint>[0]) => {
		try {
			setSaving(true);
			await addEndpoint(args);
		} catch (e) {
			console.error("[Sidebar] addEndpoint failed:", e);
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteGroup = (
		e: React.MouseEvent,
		group: { id: string; label: string },
	) => {
		e.stopPropagation();
		setGroupToDelete({ id: group.id, label: group.label });
	};

	return (
		<div className={s.sidebar}>
			<div
				className={s.sidebarSearch}
				style={{ display: "flex", alignItems: "center", gap: 6 }}
			>
				<div className={s.searchInputWrap} style={{ flex: 1 }}>
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
				<button
					type="button"
					onClick={() => setAddOpen(true)}
					title="Добавить endpoint"
					aria-label="Добавить endpoint"
					style={{
						width: 30,
						height: 30,
						flexShrink: 0,
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						background: "var(--surface)",
						border: "1px solid var(--border)",
						borderRadius: "var(--r-md)",
						color: "var(--ink-mid)",
						cursor: "pointer",
					}}
				>
					<svg
						viewBox="0 0 12 12"
						width="12"
						height="12"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
					>
						<title>add</title>
						<path d="M6 2v8M2 6h8" />
					</svg>
				</button>
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
					const q = search.trim().toLowerCase();
					const endpoints = q
						? group.endpoints.filter((ep) => ep.path.toLowerCase().includes(q))
						: group.endpoints;
					if (q && endpoints.length === 0) return null;
					const isOpen = q ? true : !collapsed[group.id];
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
								{group.endpoints.length === 0 && (
									<button
										type="button"
										onClick={(e) => handleDeleteGroup(e, group)}
										title="Удалить пустую группу"
										aria-label="Удалить пустую группу"
										style={{
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
											marginLeft: "auto",
											padding: 2,
											background: "transparent",
											border: "none",
											color: "var(--ink-low)",
											cursor: "pointer",
										}}
									>
										<svg
											viewBox="0 0 14 14"
											width="13"
											height="13"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.4"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<title>delete</title>
											<path d="M2.5 3.5h9M5 3.5V2.5h4v1M4 3.5l.5 8h5l.5-8" />
										</svg>
									</button>
								)}
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
									{endpoints.map((ep) => {
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

			<AddEndpointModal
				open={addOpen}
				onOpenChange={setAddOpen}
				groups={groups}
				onCreate={handleCreate}
				isSaving={saving}
			/>

			{groupToDelete && (
				<DeleteGroupModal
					open={!!groupToDelete}
					onOpenChange={(open) => {
						if (!open) setGroupToDelete(null);
					}}
					group={groupToDelete}
				/>
			)}
		</div>
	);
};
