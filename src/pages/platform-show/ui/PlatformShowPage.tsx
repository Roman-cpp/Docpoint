import type { FC } from "react";
import { Link, useParams } from "react-router";
import { usePlatformDocs, usePlatformsStore } from "@/entities/platform";
import {
	actionFetchEnvironmentsPlatform,
	useEnvironmentsStore,
} from "@/features/environment";
import { actionFetchPlatform, usePlatformStore } from "@/features/platform";
import s from "@/pages/docs/ui/ApiExplorerPage.module.css";
import { Sidebar } from "@/pages/docs/ui/Sidebar";
import { Header } from "@/widgets/header";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview: FC<{ id: string }> = ({ id }) => {
	const { platforms } = usePlatformsStore();
	const { docs, isDocsLoading } = usePlatformDocs(id);

	const platform = platforms.find((p) => p.id === id);

	if (!platform) {
		return (
			<div className={s.overview}>
				<span className={s.ovEyebrow}>Platform</span>
				<h1 className={s.ovTitle}>Платформа не найдена</h1>
			</div>
		);
	}

	return (
		<div className={s.overview}>
			{isDocsLoading ? (
				<p className={s.ovSub}>Загрузка документов…</p>
			) : docs.length === 0 ? (
				<p className={s.ovSub}>В этой платформе пока нет документов</p>
			) : (
				<div className={s.apiCardsGrid}>
					{docs.map((a) => (
						<Link to={`/doc-show/${a.id}`} key={a.id} className={s.apiCard}>
							<div className={s.acAccent} />
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
					))}
				</div>
			)}
		</div>
	);
};

/* ═══════════════ MAIN PAGE ═══════════════ */
export const PlatformShowPage: FC = () => {
	const { id } = useParams<{ id: string }>();
	const fetchEnvironments = useEnvironmentsStore(
		actionFetchEnvironmentsPlatform,
	);
	const fetchPlatform = usePlatformStore(actionFetchPlatform);

	if (!id) return null;

	fetchEnvironments(id);
	fetchPlatform(id);

	return (
		<div className={s.wrapper}>
			<Header section="platform" activeLink="docs" />

			<div className={s.shell}>
				<Sidebar />
				<Overview id={id} />
			</div>
		</div>
	);
};
