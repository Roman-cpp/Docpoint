import { type FC, useState } from "react";
import { toast } from "@/core/toast";
import { EnvironmentModal } from "@/entities/environment";
import {
	actionAddEnvironment,
	actionSelectEnvironment,
	selectEnvironments,
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { selectPlatform, usePlatformStore } from "@/features/platform";
import { getEnvDotColor } from "@/shared/lib/env-color";
import s from "./EnvironmentPage.module.css";
import { PlusIcon } from "./parts";

export const Sidebar: FC = () => {
	const environments = useEnvironmentsStore(selectEnvironments);
	const selectedEnvironment = useEnvironmentsStore(selectSelectedEnvironment);
	const selectedtPlatform = usePlatformStore(selectPlatform);

	const selectEnvironment = useEnvironmentsStore(actionSelectEnvironment);
	const addEnvironment = useEnvironmentsStore(actionAddEnvironment);

	const [modalOpen, setModalOpen] = useState(false);

	const handleCreate = () => {
		if (!selectedtPlatform) {
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
						const isActive = env.id === selectedEnvironment?.id;
						return (
							<button
								key={env.id}
								type="button"
								className={`${s.envSbItem} ${isActive ? s.active : ""}`}
								onClick={() => selectEnvironment(env.id)}
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

			{modalOpen && selectedtPlatform && (
				<EnvironmentModal
					platformId={selectedtPlatform.id}
					onClose={() => setModalOpen(false)}
					onCreated={(env) => addEnvironment(env)}
				/>
			)}
		</aside>
	);
};
