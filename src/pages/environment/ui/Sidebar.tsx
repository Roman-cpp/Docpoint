import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import { EnvironmentModal } from "@/entities/environment";
import {
	actionAddEnvironment,
	actionSelectEnvironment,
	selectDoc,
	selectEnvironments,
	selectSelectedEnvironment,
	useDocStore,
} from "@/features/doc";
import { getEnvDotColor } from "@/shared/lib/env-color";
import s from "./EnvironmentPage.module.css";
import { PlusIcon } from "./parts";

export const Sidebar: FC = () => {
	const doc = useDocStore(selectDoc);
	const environments = useDocStore(selectEnvironments);
	const selectedEnv = useDocStore(selectSelectedEnvironment);
	const selectEnv = useDocStore(actionSelectEnvironment);
	const addEnvironment = useDocStore(actionAddEnvironment);

	const [modalOpen, setModalOpen] = useState(false);

	const handleCreate = () => {
		if (!doc) {
			toast({
				variant: "error",
				title: "Error",
				description: "No document loaded",
			});
			return;
		}
		setModalOpen(true);
	};

	return (
		<aside className={s.envSb}>
			<div className={s.envSbH}>
				<span className={s.envSbHTitle}>Окружения · {environments.length}</span>
				<button
					type="button"
					className={s.envSbHAdd}
					aria-label="Создать окружение"
					title="Создать"
					onClick={handleCreate}
				>
					<PlusIcon />
				</button>
			</div>
			<div className={s.envSbList}>
				{environments.length === 0 ? (
					<div className={s.envSbEmpty}>
						Окружений ещё нет.{" "}
						<button
							type="button"
							className={s.envSbEmptyLink}
							onClick={handleCreate}
						>
							Создать
						</button>
					</div>
				) : (
					environments.map((env) => {
						const isActive = env.id === selectedEnv?.id;
						return (
							<button
								key={env.id}
								type="button"
								className={`${s.envSbItem} ${isActive ? s.active : ""}`}
								onClick={() => selectEnv(env.id)}
							>
								<span
									className={s.envSbItemDot}
									style={{ background: getEnvDotColor(env.env) }}
								/>
								<span>{env.label}</span>
								<span className={s.envSbItemTag}>{env.env}</span>
							</button>
						);
					})
				)}
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
