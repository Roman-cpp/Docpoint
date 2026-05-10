import { useState, type FC } from "react";
import s from "./TokenModal.module.css";

interface TokenModalProps {
	current: string;
	onClose: () => void;
	onSave: (val: string) => void;
}

export const TokenModal: FC<TokenModalProps> = ({
	current,
	onClose,
	onSave,
}) => {
	const [val, setVal] = useState(current);
	const save = () => {
		onSave(val.trim());
		onClose();
	};
	return (
		<div className={s.modalOverlay} onClick={onClose}>
			<div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
				<div className={s.modalHdr}>
					<span className={s.modalTitle}>Bearer token</span>
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
					<p className={s.modalDesc}>
						Paste a Bearer token. It will be sent as{" "}
						<span className={s.ic}>Authorization: Bearer …</span> on
						authenticated requests in the Try It panel.
					</p>
					<input
						className={s.modalInput}
						placeholder="eyJ0eXAiOiJKV1Qi…"
						value={val}
						onChange={(e) => setVal(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && save()}
						autoFocus
					/>
					<div className={s.modalActions}>
						<button className={s.modalSave} onClick={save}>
							Save token
						</button>
						{current && (
							<button
								className={s.modalClear}
								onClick={() => {
									onSave("");
									onClose();
								}}
							>
								Clear
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
