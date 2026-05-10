import { type FC } from "react";
import s from "./ApiExplorerPage.module.css";
import { Sidebar } from "./Sidebar";
import type { Doca } from "@/entities/doca";
import { Header } from "@/widgets/header";
import { Link } from "react-router";

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview = () => {
	const docs: Doca[] = [
		{
			id: "core",
			name: "Core API",
			version: "v2",
			desc: "Main application API. Users, articles, tags, comments — the full content layer.",
			tags: ["REST", "JSON", "Auth required"],
		},
		{
			id: "core",
			name: "Core API",
			version: "v2",
			desc: "Main application API. Users, articles, tags, comments — the full content layer.",
			tags: ["REST", "JSON", "Auth required"],
		},
	];
	return (
		<div className={s.overview}>
			<div className={s.apiCardsGrid}>
				{docs.map((a) => {
					// const sc = statusColor(a.status);
					return (
						<Link to="docs" key={a.id} className={`${s.apiCard}`}>
							<div className={s.acAccent} />
							<div className={s.acTop}>
								{/* <div className={s.acIcon}>
									{a.icon}
								</div> */}
								{/* <span
									className={s.acStatus}
									// style={{ background: sc.bg, color: sc.color }}
								>
									<span
										style={{
											width: 6,
											height: 6,
											borderRadius: "50%",
											background: sc.color,
											display: "inline-block",
											flexShrink: 0,
										}}
									/>
									{sc.label}
								</span> */}
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
