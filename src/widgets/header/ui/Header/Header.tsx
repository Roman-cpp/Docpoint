import type { FC } from "react";
import { Link } from "react-router";
import {
	actionSelectEnvironment,
	selectEnvironments,
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { selectPlatform, usePlatformStore } from "@/features/platform";
import { getEnvDotColor } from "@/shared/lib/env-color";
import s from "./Header.module.css";

const NAV_LINKS: { label: string; href: string; active?: boolean }[] = [
	{ label: "HTTP Client", href: "/http-client" },
	{ label: "Entities", href: "/entity" },
];

interface HeaderProps {
	section: string;
	activeLink?: string;
}

export const Header: FC<HeaderProps> = ({ section }) => {
	const environments = useEnvironmentsStore(selectEnvironments);
	const selectedEnvironment = useEnvironmentsStore(selectSelectedEnvironment);
	const selectedPlatform = usePlatformStore(selectPlatform);
	const selectEnvironment = useEnvironmentsStore(actionSelectEnvironment);

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
						const isActive = env.id === selectedEnvironment?.id;
						return (
							<button
								key={env.id}
								type="button"
								className={`${s.pfEnvBtn} ${isActive ? s.active : ""}`}
								onClick={() => selectEnvironment(env.id)}
							>
								<span
									className={s.pfEnvDot}
									style={{ background: getEnvDotColor(env.env) }}
								/>
								{env.label}
							</button>
						);
					})}
				</div>
			)}

			<div className={s.pfNavLinks}>
				{selectedPlatform && (
					<Link
						key="/environments"
						to={`/platform-show/${selectedPlatform.id}`}
						className={`${s.pfNavLink} ${s.active}`}
					>
						API Docs
					</Link>
				)}
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
