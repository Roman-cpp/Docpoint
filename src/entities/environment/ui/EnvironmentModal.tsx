import { useState, type FC } from "react";
import s from "./VariableModal.module.css";
import { createEnvironment } from "../api";
import type { Environment } from "../model/type";

interface EnvironmentModalProps {
	docId: string;
	onClose: () => void;
	onCreated: (env: Environment) => void;
}

export const EnvironmentModal: FC<EnvironmentModalProps> = ({
	docId,
	onClose,
	onCreated,
}) => {
	const [label, setLabel] = useState("");
	const [env, setEnv] = useState("");
	const [baseUrl, setBaseUrl] = useState("");
	const [prefix, setPrefix] = useState("");
	const [loading, setLoading] = useState(false);

	const save = async () => {
		const trimmedLabel = label.trim();
		const trimmedEnv = env.trim();
		if (!trimmedLabel || !trimmedEnv) return;
		setLoading(true);
		try {
			const created = await createEnvironment(docId, {
				env: trimmedEnv,
				label: trimmedLabel,
				baseUrl: baseUrl.trim(),
				prefix: prefix.trim(),
				value: [],
				accessToken: null,
			});
			onCreated({ ...created, accessToken: null });
			onClose();
		} finally {
			setLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") save();
		if (e.key === "Escape") onClose();
	};

	return (
		<div className={s.modalOverlay} onClick={onClose}>
			<div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
				<div className={s.modalHdr}>
					<span className={s.modalTitle}>New environment</span>
					<button className={s.modalX} onClick={onClose}>
						<svg
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
							autoFocus
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
						<button
							className={s.modalSave}
							onClick={save}
							disabled={loading || !label.trim() || !env.trim()}
						>
							{loading ? "Creating…" : "Create"}
						</button>
						<button className={s.modalCancel} onClick={onClose}>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
