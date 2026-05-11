import { useState, type FC } from "react";
import s from "./Header.module.css";
import {
	actionSelectEnvConfig,
	selectEnvConfigs,
	selectSelectedEnvConfig,
	useDocaStore,
} from "@/features/doca";
import { TokenModal } from "./TokenModal";
import { getEnvDotColor } from "@/shared/lib/env-color";

export type NavLink =
	| "docs"
	| "explorer"
	| "http-client"
	| "schemas"
	| "architecture";

const NAV_LINKS: { id: NavLink; label: string; href: string }[] = [
	{ id: "docs", label: "API Docs", href: "/docs" },
	{ id: "http-client", label: "HTTP Client", href: "/http-client" },
	{ id: "schemas", label: "Schemas", href: "/api-schemas" },
	{ id: "architecture", label: "Architecture", href: "/architecture" },
];

interface HeaderProps {
	section: string;
	activeLink?: NavLink;
}

export const Header: FC<HeaderProps> = ({ section, activeLink }) => {
	const envConfigs = useDocaStore(selectEnvConfigs);
	const selectedEnvConfig = useDocaStore(selectSelectedEnvConfig);
	const selectEnvConfig = useDocaStore(actionSelectEnvConfig);

	const [authToken, setToken] = useState("");
	const [tokenModal, setModal] = useState(false);

	return (
		<nav className={s.nav}>
			<div className={s.navBrand}>
				Lesser Known Laravel
				<div className={s.navSep} />
				<span className={s.navSection}>{section}</span>
			</div>

			<div className={s.navEnv}>
				{envConfigs.map((env) => (
					<button
						key={env.id}
						className={`${s.envBtn}${env.id === selectedEnvConfig?.id ? " " + s.envBtnActive : ""}`}
						onClick={() => selectEnvConfig(env.id)}
					>
						<span
							className={s.envDot}
							style={{
								background:
									env.id === selectedEnvConfig?.id
										? getEnvDotColor(env.env)
										: "var(--border)",
							}}
						/>
						{env.label}
					</button>
				))}
			</div>

			<div className={s.navLinks}>
				{NAV_LINKS.map(({ id, label, href }) => (
					<a
						key={id}
						className={`${s.navLink}${activeLink === id ? " " + s.navLinkActive : ""}`}
						href={href}
					>
						{label}
					</a>
				))}
				<button
					className={`${s.navLink} ${s.navLinkCta}`}
					onClick={() => setModal(true)}
				>
					Get token →
				</button>
			</div>
			{tokenModal && (
				<TokenModal
					current={authToken}
					onClose={() => setModal(false)}
					onSave={setToken}
				/>
			)}
		</nav>
	);
};
