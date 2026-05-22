import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import { deleteEnvironmentApi, EnvironmentModal } from "@/entities/environment";
import {
	actionAddEnvironment,
	actionDeleteEnvironment,
	actionSelectEnvironment,
	selectDoc,
	selectEnvironments,
	selectSelectedEnvironment,
	useDocStore,
} from "@/features/doc";
import { getEnvDotColor } from "@/shared/lib/env-color";
import s from "./EnvironmentPage.module.css";

export const Sidebar: FC = () => {
	const doc = useDocStore(selectDoc);
	const environments = useDocStore(selectEnvironments);
	const selectedEnv = useDocStore(selectSelectedEnvironment);
	const selectEnv = useDocStore(actionSelectEnvironment);
	const addEnvironment = useDocStore(actionAddEnvironment);
	const removeEnvironment = useDocStore(actionDeleteEnvironment);

	const [modalOpen, setModalOpen] = useState(false);

	const handleDelete = async (
		e: React.MouseEvent,
		id: string,
		label: string,
	) => {
		e.stopPropagation();
		if (!confirm(`Delete environment "${label}"?`)) return;
		try {
			await deleteEnvironmentApi(id);
			removeEnvironment(id);
		} catch {
			toast({
				variant: "error",
				title: "Error",
				description: "Failed to delete environment",
			});
		}
	};

	return (
		<aside className={s.sidebar}>
			<div className={s.sidebarHdr}>
				<span className={s.sidebarTitle}>Environments</span>
				<button
					className={s.sidebarAdd}
					title="New environment"
					onClick={() => {
						if (!doc) {
							toast({
								variant: "error",
								title: "Error",
								description: "No document loaded",
							});
							return;
						}
						setModalOpen(true);
					}}
				>
					+
				</button>
			</div>
			<div className={s.envList}>
				{environments.map((env) => (
					<div
						key={env.id}
						className={`${s.envItem}${selectedEnv?.id === env.id ? " " + s.envItemActive : ""}`}
						onClick={() => selectEnv(env.id)}
						role="button"
						tabIndex={0}
					>
						<span
							className={s.envDot}
							style={{ background: getEnvDotColor(env.env) }}
						/>
						<span className={s.envLabel}>{env.label}</span>
						<span className={s.envTag}>{env.env}</span>
						<button
							className={s.envDeleteBtn}
							title="Delete environment"
							onClick={(e) => handleDelete(e, env.id, env.label)}
						>
							<svg
								viewBox="0 0 14 14"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								width="12"
								height="12"
							>
								<path d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 8M9 3.5l-.5 8" />
							</svg>
						</button>
					</div>
				))}
			</div>

			{modalOpen && doc && (
				<EnvironmentModal
					docId={doc.id}
					onClose={() => setModalOpen(false)}
					onCreated={(env) => addEnvironment(env)}
				/>
			)}
		</aside>
	);
};
