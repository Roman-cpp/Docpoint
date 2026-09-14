import { type FC, useState } from "react";
import type { Environment } from "../../model/environment.type";
import { useEnvironmentsStore } from "../../store/useEnvironmentsStore";
import s from "../VariableModal.module.css";

interface EnvironmentModalProps {
	platformId: string;
	onClose: () => void;
	onCreated: (env: Environment) => void;
}

export const EnvironmentModal: FC<EnvironmentModalProps> = ({
	platformId,
	onClose,
	onCreated,
}) => {
	const [label, setLabel] = useState("");
	const [env, setEnv] = useState("");
	const [baseUrl, setBaseUrl] = useState("");
	const [prefix, setPrefix] = useState("");
	const [loading, setLoading] = useState(false);
	const { createEnvironmentAsync } = useEnvironmentsStore();

	const save = async () => {
		const trimmedLabel = label.trim();
		const trimmedEnv = env.trim();
		if (!trimmedLabel || !trimmedEnv) return;
		setLoading(true);
		try {
			const created = await createEnvironmentAsync({
				env: trimmedEnv,
				label: trimmedLabel,
				baseUrl: baseUrl.trim(),
				prefix: prefix.trim(),
				platformId,
			});
			onCreated(created);
			onClose();
		} finally {
			setLoading(false);
		}
	};

	/* Escape ловит оверлей — сюда доходит всплытием откуда угодно из модалки. */
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") save();
	};

	return (
		<div
			className={s.modalOverlay}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div className={s.modalBox}>
				<div className={s.modalHdr}>
					<div className={s.modalHdrText}>
						<span className={s.modalTitle}>Новое окружение</span>
						<span className={s.modalSubtitle}>
							Базовый URL и тег для группы запросов
						</span>
					</div>
					<button
						type="button"
						className={s.modalX}
						onClick={onClose}
						aria-label="Закрыть"
					>
						<svg
							aria-hidden="true"
							viewBox="0 0 11 11"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							width="11"
							height="11"
						>
							<path d="M1.5 1.5l8 8M9.5 1.5l-8 8" />
						</svg>
					</button>
				</div>
				<div className={s.modalBody}>
					<div className={s.field}>
						<label className={s.label}>Label</label>
						<input
							className={s.input}
							placeholder="Production"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
					</div>
					<div className={s.field}>
						<label className={s.label}>Env</label>
						<input
							className={s.input}
							placeholder="prod"
							value={env}
							onChange={(e) => setEnv(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
					</div>
					<div className={s.field}>
						<label className={s.label}>Base URL</label>
						<input
							className={s.input}
							placeholder="https://api.example.com"
							value={baseUrl}
							onChange={(e) => setBaseUrl(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
					</div>
					<div className={s.field}>
						<label className={s.label}>Prefix</label>
						<input
							className={s.input}
							placeholder="/api/v1"
							value={prefix}
							onChange={(e) => setPrefix(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
					</div>
					<div className={s.modalActions}>
						<button type="button" className={s.modalCancel} onClick={onClose}>
							Отмена
						</button>
						<button
							type="button"
							className={s.modalSave}
							onClick={save}
							disabled={loading || !label.trim() || !env.trim()}
						>
							{loading ? "Создаём…" : "Создать"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
