import type { FC } from "react";
import { Link } from "react-router";
import {
	actionSelectEnvironment,
	selectEnvironments,
	useDocStore,
} from "@/features/doc";
import { selectEnvironment, useEnvironmentStore } from "@/features/environment";
import { getEnvDotColor } from "@/shared/lib/env-color";
import s from "./Header.module.css";

const NAV_LINKS: { label: string; href: string; active?: boolean }[] = [
	{ label: "API Docs", href: "/" },
	{ label: "HTTP Client", href: "/http-client" },
	{ label: "Entities", href: "/entity" },
];

interface HeaderProps {
	section: string;
	activeLink?: string;
}

export const Header: FC<HeaderProps> = ({ section }) => {
	const environments = useDocStore(selectEnvironments);
	const environment = useEnvironmentStore(selectEnvironment);
	const selectEnv = useDocStore(actionSelectEnvironment);

	return (
		<nav className={s.pfNav}>
			<Link to="/" className={s.pfNavBrandLink}>
				<div className={s.pfNavBrand}>
					Docpoint
					<span className={s.pfNavSep} />
					<span className={s.pfNavSection}>{section}</span>
				</div>
			</Link>

			{environments.length > 0 && (
				<div className={s.pfNavEnv}>
					{environments.map((env) => {
						const isActive = env.id === environment?.id;
						return (
							<button
								key={env.id}
								type="button"
								className={`${s.pfEnvBtn} ${isActive ? s.active : ""}`}
								onClick={() => selectEnv(env.id)}
							>
								<span
									className={s.pfEnvDot}
									style={{ background: getEnvDotColor(env.env) }}
								/>
								{env.env}
							</button>
						);
					})}
				</div>
			)}

			<div className={s.pfNavLinks}>
				{NAV_LINKS.map((link) => (
					<Link
						key={link.href}
						to={link.href}
						className={`${s.pfNavLink} ${link.active ? s.active : ""}`}
					>
						{link.label}
					</Link>
				))}
				{environments.length > 0 && (
					<Link
						key="/environments"
						to="/environments"
						className={`${s.pfNavLink} ${s.active}`}
					>
						Environments
					</Link>
				)}
				{/* <Link to="/profile" className={s.pfNavUser}>
					<span className={s.pfNavUserAvatar}>ИП</span>
					<span className={s.pfNavUserName}>Иван П.</span>
					<ChevronIcon />
				</Link> */}
			</div>
		</nav>
	);
};
