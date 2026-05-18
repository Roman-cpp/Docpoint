import { type FC } from "react";
import s from "./ApiExplorerPage.module.css";
import { Sidebar } from "./Sidebar";
import { Header } from "@/widgets/header";
import { Link } from "react-router";
import { actionDeleteDoc, selectDocs, useDocStore } from "@/features/doc";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview = () => {
	const docs = useDocStore(selectDocs);
	const deleteDoca = useDocStore(actionDeleteDoc);

	const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
		e.preventDefault();
		e.stopPropagation();
		if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
		deleteDoca(id);
	};

	return (
		<div className={s.overview}>
			<div className={s.apiCardsGrid}>
				{docs.map((a) => {
					return (
						<Link to="docs" key={a.id} className={`${s.apiCard}`}>
							<div className={s.acAccent} />
							<div className={s.acTop}>
								<button
									className={s.acDeleteBtn}
									onClick={(e) => handleDelete(e, a.id, a.name)}
									title="Delete"
								>
									<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
										<path d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 8M9 3.5l-.5 8" />
									</svg>
								</button>
							</div>
							<div className={s.acName}>{a.name}</div>
							<div className={s.acDesc}>{a.desc}</div>
							<div className={s.acFooter}>
								{a.tags.map((t) => (
									<span key={t} className={s.acTag}>
										{t}
									</span>
								))}
								<span className={s.acCount}> endpoints →</span>
							</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
};

/* ═══════════════ MAIN PAGE ═══════════════ */
export const ApiExplorerPage: FC = () => {
	return (
		<div className={s.wrapper}>
			<Header section="docs1" activeLink="docs" />

			<div className={s.shell}>
				<Sidebar />
				<Overview />
			</div>
		</div>
	);
};
