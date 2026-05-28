import type { FC } from "react";
import { Link } from "react-router";
import {
	actionSelectEnvironment,
	selectEnvironments,
	selectSelectedEnvironment,
	useDocStore,
} from "@/features/doc";
import { getEnvDotColor } from "@/shared/lib/env-color";
import { ChevronIcon } from "../../../../pages/environment/ui/parts";
import s from "./Header.module.css";

const NAV_LINKS: { label: string; href: string; active?: boolean }[] = [
	{ label: "API Docs", href: "/" },
	{ label: "HTTP Client", href: "/http-client" },
	{ label: "Entities", href: "/entity" },
	{ label: "Environments", href: "/environments", active: true },
];

interface HeaderProps {
	section: string;
	activeLink?: string;
}

export const Header: FC<HeaderProps> = ({ section }) => {
	const environments = useDocStore(selectEnvironments);
	const selectedEnv = useDocStore(selectSelectedEnvironment);
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

			<div className={s.pfNavEnv}>
				{environments.length === 0 ? (
					<span className={s.pfNavEnvEmpty}>нет окружений</span>
				) : (
					environments.map((env) => {
						const isActive = env.id === selectedEnv?.id;
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
					})
				)}
			</div>

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
				{/* <Link to="/profile" className={s.pfNavUser}>
					<span className={s.pfNavUserAvatar}>ИП</span>
					<span className={s.pfNavUserName}>Иван П.</span>
					<ChevronIcon />
				</Link> */}
			</div>
		</nav>
	);
};
