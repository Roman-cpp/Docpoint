import { useState, type FC } from "react";
import s from "./ApiDocsPage.module.css";
import type { EnvConfig, EnvKey } from "@/pages/api-explorer/model/types";
import s2 from "./../../../pages/api-explorer/ui/ApiExplorerPage.module.css";
import { getEnvDotColor } from "@/shared/lib/env-color";

interface HeaderProps {
	version: string;
	onTweaksToggle: () => void;
}

export const ENV_CONFIG: Record<EnvKey, EnvConfig> = {
	prod: {
		label: "Production",
		baseUrl: "https://api.example.com",
	},
	staging: {
		label: "Staging",
		baseUrl: "https://staging.api.example.com",
	},
	local: { label: "Local", baseUrl: "http://localhost:8000" },
};

export const Header: FC<HeaderProps> = ({ version }) => {
	const [env, setEnv] = useState<EnvKey>("prod");
	return (
		<nav className={s.nav}>
			<div className={s.navBrand}>
				Lesser Known Laravel
				<div className={s.navBrandSep} />
				<span className={s.navBrandSection}>API Reference</span>
			</div>

			<div className={s2.navEnv}>
				{(
					Object.entries(ENV_CONFIG) as [EnvKey, (typeof ENV_CONFIG)[EnvKey]][]
				).map(([k, cfg]) => (
					<button
						key={k}
						className={`${s2.envBtn}${env === k ? " " + s2.on : ""}`}
						onClick={() => setEnv(k)}
					>
						<span
							className={s2.envDot}
							style={{ background: env === k ? getEnvDotColor(k) : "var(--border)" }}
						/>
						{cfg.label}
					</button>
				))}
			</div>

			<div className={s.navRight}>
				<span className={s.navBadge}>v{version.replace("v", "")}</span>
				<div className={s.navLinks}>
					<a className={s.navLink} href="#">
						Docs
					</a>
					<a className={`${s.navLink} ${s.active}`} href="#">
						API
					</a>
					<a className={s.navLink} href="#">
						Changelog
					</a>
					<a className={`${s.navLink} ${s.cta}`} href="#">
						Get token →
					</a>
				</div>
			</div>
		</nav>
	);
};
