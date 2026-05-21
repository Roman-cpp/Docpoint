import { type FC, useState } from "react";
import {
	actionUpdateEnvironmentToken,
	selectEnvironmentToken,
	useDocStore,
} from "@/features/doc";
import s from "./TokenModal.module.css";

interface TokenModalProps {
	onClose: () => void;
}

export const TokenModal: FC<TokenModalProps> = ({ onClose }) => {
	const accessToken = useDocStore(selectEnvironmentToken);

	const setAccessToken = useDocStore(actionUpdateEnvironmentToken);

	const [val, setVal] = useState(accessToken ?? "");
	const save = () => {
		setAccessToken(val.trim());
		onClose();
	};
	return (
		<div className={s.modalOverlay} onClick={onClose}>
			<div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
				<div className={s.modalHdr}>
					<span className={s.modalTitle}>Bearer token</span>
					<button className={s.modalX} onClick={onClose} type="button">
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
						<button className={s.modalSave} onClick={save} type="button">
							Save token
						</button>
						{accessToken && (
							<button
								type="button"
								className={s.modalClear}
								onClick={() => {
									setAccessToken("");
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
