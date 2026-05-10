import s from "./ApiExplorerPage.module.css";
import type { Doca } from "@/entities/doca";

export const Sidebar = ({}) => {
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
		<aside className={s.sidebar}>
			<div className={s.sbApis}>
				<span className={s.sbSecLbl}>APIs</span>
				{docs.map((a) => {
					return (
						<button key={a.id} className={`${s.sbApiBtn}`}>
							{/* <div className={s.sbApiIcon} style={{ background: a.iconBg }}>
								{a.icon}
							</div> */}
							<span className={s.sbApiName}>{a.name}</span>
							<div className={s.sbApiDot} />
						</button>
					);
				})}
			</div>
		</aside>
	);
};
