import { useState } from "react";
import { Link } from "react-router";
import { useDocsStore } from "@/entities/doc-api";
import type { HttpMethod } from "@/entities/shared/http-method";
import {
	actionfetchDocApi,
	EditDocApiModal,
	selectDocApi,
	selectEntities,
	selectGroups,
	useDocApiStore,
} from "@/features/doc-api";
import {
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { joinUrl } from "@/shared/lib/url";
import s from "@/shared/styles/apiDocs.module.css";
import { CatalogBackLink } from "@/widgets/catalog-explorer";

const METHOD_STYLES: Record<HttpMethod, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
	HEAD: { color: "var(--delete)", bg: "var(--delete-bg)" },
};

export const OverviewPage = () => {
	const doc = useDocApiStore(selectDocApi);
	const groups = useDocApiStore(selectGroups);
	const entities = useDocApiStore(selectEntities);
	const env = useEnvironmentsStore(selectSelectedEnvironment);
	const fetchDoc = useDocApiStore(actionfetchDocApi);
	const { updateDocAsync, isUpdating } = useDocsStore();
	const [editing, setEditing] = useState(false);

	const endpointCount =
		groups?.reduce((sum, g) => sum + g.endpoints.length, 0) ?? 0;
	const resourceCount = entities.length;

	if (!doc) return null;

	// База всех запросов документа: base URL выбранного окружения + его префикс +
	// префикс самого документа. Без выбранного окружения показываем то, что
	// документ добавляет от себя.
	const baseUrl = joinUrl(env?.baseUrl, env?.prefix, doc.prefix) || "—";

	const saveDoc = async (updates: Parameters<typeof updateDocAsync>[0]) => {
		try {
			await updateDocAsync(updates);
			// Имя и описание уехали в дерево, версия и префикс — в поля документа:
			// рабочий стор страницы перечитывается целиком.
			await fetchDoc(doc.id);
			setEditing(false);
		} catch {
			/* тост показывает мутация */
		}
	};

	return (
		<div>
			<div className={s.breadcrumb}>
				<CatalogBackLink nodeId={doc.id} className={s.bcItem} />
				<span className={s.bcSep}>/</span>
				<span className={s.bcCurrent}>Overview</span>
			</div>

			<div className={s.endpointHeader}>
				<div className={s.endpointTitleRow}>
					<h1
						style={{
							fontFamily: "var(--font-serif)",
							fontSize: "30px",
							fontWeight: 400,
							letterSpacing: "-0.3px",
							lineHeight: 1.2,
						}}
					>
						{doc.name}
					</h1>
					<button
						type="button"
						className={s.overviewEditBtn}
						onClick={() => setEditing(true)}
					>
						Редактировать
					</button>
				</div>
			</div>

			{editing && (
				<EditDocApiModal
					open
					onOpenChange={(open) => !open && !isUpdating && setEditing(false)}
					doc={doc}
					isSaving={isUpdating}
					onSave={saveDoc}
				/>
			)}

			<div className={s.overviewGrid}>
				<div className={s.overviewCard}>
					<div className={s.overviewCardLabel}>Base URL</div>
					<div className={s.overviewCardValue}>
						<code>{baseUrl}</code>
					</div>
				</div>
				<div className={s.overviewCard}>
					<div className={s.overviewCardLabel}>Version</div>
					<div className={s.overviewCardValue}>
						<code>{doc.version}</code>
					</div>
				</div>
				<div className={s.overviewCard}>
					<div className={s.overviewCardLabel}>Endpoints</div>
					<div className={s.overviewCardValue}>{endpointCount}</div>
				</div>
				<div className={s.overviewCard}>
					<div className={s.overviewCardLabel}>Resources</div>
					<div className={s.overviewCardValue}>{resourceCount}</div>
				</div>
			</div>

			<div className={s.divider} />

			{/* Навигация по документу: группа → её эндпоинты. Ничего, кроме метода
			    и пути — описания и теги живут на странице самого эндпоинта. */}
			<div className={s.sectionBlock}>
				<div className={s.sectionLabel}>Endpoints</div>
				{endpointCount === 0 ? (
					<div className={s.emptyState}>
						<span>Пока нет ни одного эндпоинта</span>
					</div>
				) : (
					<div style={{ display: "grid", gap: "18px" }}>
						{groups?.map((group) => {
							if (group.endpoints.length === 0) return null;
							return (
								<div key={group.id}>
									<div
										style={{
											fontSize: "12px",
											fontWeight: 600,
											color: "var(--ink-mid)",
											marginBottom: "8px",
										}}
									>
										{group.label}
									</div>
									<div
										style={{
											border: "1px solid var(--border)",
											borderRadius: "10px",
											overflow: "hidden",
										}}
									>
										{group.endpoints.map((ep, i) => {
											const ms = METHOD_STYLES[ep.method];
											return (
												<Link
													key={ep.id}
													to={`/endpoint-show/${ep.id}`}
													style={{
														display: "flex",
														alignItems: "center",
														gap: "10px",
														padding: "9px 14px",
														borderTop:
															i === 0 ? "none" : "1px solid var(--border)",
														color: "var(--ink)",
														textDecoration: "none",
													}}
												>
													<span
														className={s.methodBadge}
														style={{
															color: ms?.color,
															background: ms?.bg,
															fontSize: "10px",
															padding: "2px 7px",
															minWidth: "52px",
															textAlign: "center",
														}}
													>
														{ep.method}
													</span>
													<span
														style={{
															fontFamily: "var(--font-mono)",
															fontSize: "13px",
														}}
													>
														{ep.path}
													</span>
												</Link>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};
