import { type FC, useState } from "react";
import { deleteVariable } from "../api";
import type { Variable } from "../model/type";
import s from "./VariableModal.module.css";

interface DeleteVariableModalProps {
	variable: Variable;
	onClose: () => void;
	onDeleted: (variableId: string) => void;
}

export const DeleteVariableModal: FC<DeleteVariableModalProps> = ({
	variable,
	onClose,
	onDeleted,
}) => {
	const [loading, setLoading] = useState(false);

	const confirm = async () => {
		setLoading(true);
		try {
			await deleteVariable(variable.id);
			onDeleted(variable.id);
			onClose();
		} finally {
			setLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Enter") confirm();
		if (e.key === "Escape") onClose();
	};

	return (
		<div className={s.modalOverlay} onClick={onClose}>
			<div
				className={s.modalBox}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={handleKeyDown}
				tabIndex={-1}
			>
				<div className={s.modalHdr}>
					<div className={s.modalHdrText}>
						<span className={s.modalTitle}>Удалить переменную</span>
						<span className={s.modalSubtitle}>
							Действие необратимо. Переменная будет удалена из окружения.
						</span>
					</div>
					<button
						type="button"
						className={s.modalX}
						onClick={onClose}
						aria-label="Закрыть"
					>
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
					<p className={s.modalMessage}>
						Удалить переменную <code>{`{{${variable.name}}}`}</code>?
					</p>
					<div className={s.modalActions}>
						<button
							type="button"
							className={s.modalCancel}
							onClick={onClose}
							disabled={loading}
						>
							Отмена
						</button>
						<button
							type="button"
							className={s.modalDanger}
							onClick={confirm}
							disabled={loading}
							autoFocus
						>
							{loading ? "Удаляем…" : "Удалить"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
