import { type FC, useState } from "react";
import { Checkbox } from "@/shared/ui-kit/controls";
import { createVariableApi } from "../../api/create-variable-api";
import { updateVariableApi } from "../../api/update-variable-api";
import type { Variable } from "../../model/environment.type";
import s from "../VariableModal.module.css";

interface VariableModalProps {
	environmentId: string;
	variable?: Variable;
	onClose: () => void;
	onSave: (variable: Variable) => void;
}

export const VariableModal: FC<VariableModalProps> = ({
	environmentId,
	variable,
	onClose,
	onSave,
}) => {
	const isEdit = !!variable;
	const [name, setName] = useState(variable?.name ?? "");
	const [value, setValue] = useState(variable?.value ?? "");
	const [isSecret, setIsSecret] = useState(variable?.isSecret ?? false);
	const [loading, setLoading] = useState(false);

	const save = async () => {
		const trimmedName = name.trim();
		if (!trimmedName) return;
		setLoading(true);
		try {
			if (isEdit && variable) {
				await updateVariableApi({
					id: variable.id,
					name: trimmedName,
					value: value.trim(),
					isSecret,
				});
				onSave({
					...variable,
					name: trimmedName,
					value: value.trim(),
					isSecret,
				});
			} else {
				const created = await createVariableApi({
					environmentId,
					variable: {
						name: trimmedName,
						value: value.trim(),
						isSecret,
					},
				});
				onSave(created);
			}
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
						<span className={s.modalTitle}>
							{isEdit ? "Редактировать переменную" : "Новая переменная"}
						</span>
						<span className={s.modalSubtitle}>
							{isEdit
								? "Изменения применятся ко всем запросам этого окружения"
								: "Подставляется в URL, headers и body как {{NAME}}"}
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
						<label className={s.label}>Name</label>
						<input
							className={s.input}
							placeholder="VARIABLE_NAME"
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
					</div>
					<div className={s.field}>
						<label className={s.label}>Value</label>
						<input
							className={s.input}
							placeholder="value"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
					</div>
					<Checkbox
						label="Секретное значение"
						hint="маскируется в таблице переменных"
						checked={isSecret}
						onChange={(e) => setIsSecret(e.target.checked)}
					/>
					<div className={s.modalActions}>
						<button type="button" className={s.modalCancel} onClick={onClose}>
							Отмена
						</button>
						<button
							type="button"
							className={s.modalSave}
							onClick={save}
							disabled={loading || !name.trim()}
						>
							{loading ? "Сохраняем…" : isEdit ? "Сохранить" : "Создать"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
