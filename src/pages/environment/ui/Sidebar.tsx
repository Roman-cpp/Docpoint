import type { FC } from "react";
import s from "./EnvironmentPage.module.css";
import {
	selectEnvironments,
	selectSelectedEnvironment,
	actionSelectEnvironment,
	useDocStore,
} from "@/features/doc";
import { getEnvDotColor } from "@/shared/lib/env-color";

export const Sidebar: FC = () => {
	const environments = useDocStore(selectEnvironments);
	const selectedEnv = useDocStore(selectSelectedEnvironment);
	const selectEnv = useDocStore(actionSelectEnvironment);

	return (
		<aside className={s.sidebar}>
			<div className={s.sidebarHdr}>
				<span className={s.sidebarTitle}>Environments</span>
			</div>
			<div className={s.envList}>
				{environments.map((env) => (
					<button
						key={env.id}
						className={`${s.envItem}${selectedEnv?.id === env.id ? " " + s.envItemActive : ""}`}
						onClick={() => selectEnv(env.id)}
					>
						<span
							className={s.envDot}
							style={{ background: getEnvDotColor(env.env) }}
						/>
						<span className={s.envLabel}>{env.label}</span>
						<span className={s.envTag}>{env.env}</span>
					</button>
				))}
			</div>
		</aside>
	);
};
