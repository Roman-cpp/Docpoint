import { useState } from "react";
import { Link } from "react-router";
import { useDocsStore } from "@/entities/doc-api";
import type { HttpMethod } from "@/entities/shared/http-method";
import {
	actionfetchDocApi,
	EditDocApiModal,
	selectDocApi,
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
import o from "./OverviewPage.module.css";

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
	const env = useEnvironmentsStore(selectSelectedEnvironment);
	const fetchDoc = useDocApiStore(actionfetchDocApi);
	const { updateDocAsync, isUpdating } = useDocsStore();
	const [editing, setEditing] = useState(false);

	const endpointCount =
		groups?.reduce((sum, g) => sum + g.endpoints.length, 0) ?? 0;

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

			<div className={s.headerCard}>
				<div className={s.endpointTitleRow}>
					<h1 className={o.title}>{doc.name}</h1>
					<button
						type="button"
						className={s.overviewEditBtn}
						onClick={() => setEditing(true)}
					>
						Редактировать
					</button>
				</div>

				<div className={s.headerMeta}>
					<div>
						<div className={s.overviewCardLabel}>Base URL</div>
						<div className={s.overviewCardValue}>
							<code>{baseUrl}</code>
						</div>
					</div>
					<div>
						<div className={s.overviewCardLabel}>Endpoints</div>
						<div className={s.overviewCardValue}>{endpointCount}</div>
					</div>
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

			{/* Навигация по документу: группа → её эндпоинты. Метод, путь и описание
			    в одну строку — параметры и теги живут на странице самого эндпоинта. */}
			<div className={s.sectionBlock}>
				<h2 className={s.sectionHead}>Endpoints</h2>
				{endpointCount === 0 ? (
					<div className={o.empty}>Пока нет ни одного эндпоинта</div>
				) : (
					<div className={o.groups}>
						{groups?.map((group) => {
							if (group.endpoints.length === 0) return null;
							return (
								<div key={group.id}>
									<div className={o.groupLabel}>{group.label}</div>
									<div className={o.groupList}>
										{group.endpoints.map((ep) => {
											const ms = METHOD_STYLES[ep.method];
											return (
												<Link
													key={ep.id}
													to={`/endpoint-show/${ep.id}`}
													className={o.endpoint}
												>
													<span
														className={`${s.methodBadge} ${o.method}`}
														style={{ color: ms?.color, background: ms?.bg }}
													>
														{ep.method}
													</span>
													<span className={o.path}>{ep.path}</span>
													{ep.description && (
														<span className={o.desc} title={ep.description}>
															{ep.description}
														</span>
													)}
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
