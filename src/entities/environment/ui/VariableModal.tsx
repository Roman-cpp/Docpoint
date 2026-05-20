import { useState, type FC } from "react";
import s from "./VariableModal.module.css";
import { createVariable, updateVariable } from "../api";
import type { Variable } from "../model/type";

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
	const [loading, setLoading] = useState(false);

	const save = async () => {
		const trimmedName = name.trim();
		if (!trimmedName) return;
		setLoading(true);
		try {
			if (isEdit && variable) {
				await updateVariable({ id: variable.id, name: trimmedName, value: value.trim() });
				onSave({ ...variable, name: trimmedName, value: value.trim() });
			} else {
				const created = await createVariable(environmentId, { name: trimmedName, value: value.trim() });
				onSave(created);
			}
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
					<span className={s.modalTitle}>{isEdit ? "Edit variable" : "New variable"}</span>
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
						<label className={s.label}>Name</label>
						<input
							className={s.input}
							placeholder="VARIABLE_NAME"
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={handleKeyDown}
							autoFocus
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
					<div className={s.modalActions}>
						<button
							className={s.modalSave}
							onClick={save}
							disabled={loading || !name.trim()}
						>
							{loading ? "Saving…" : isEdit ? "Save" : "Create"}
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
