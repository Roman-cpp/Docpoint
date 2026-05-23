import { type FC, type ReactNode, useEffect } from "react";
import s from "./Modal.module.css";

type Props = {
	title: string;
	subtitle?: string;
	onClose: () => void;
	/** Кнопки действий — рендерятся в нижней полосе с разделителем */
	actions?: ReactNode;
	/** Ширина бокса в px, по умолчанию 392 */
	width?: number;
	children: ReactNode;
};

export const Modal: FC<Props> = ({
	title,
	subtitle,
	onClose,
	actions,
	width,
	children,
}) => {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div className={s.overlay} onClick={onClose}>
			<div
				className={s.box}
				style={width ? { ["--modal-width" as string]: `${width}px` } : undefined}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={s.header}>
					<div className={s.headerText}>
						<span className={s.title}>{title}</span>
						{subtitle && <span className={s.subtitle}>{subtitle}</span>}
					</div>
					<button
						type="button"
						className={s.closeBtn}
						onClick={onClose}
						aria-label="Закрыть"
					>
						<CloseIcon />
					</button>
				</div>

				<div className={s.body}>
					{children}
					{actions && <div className={s.actions}>{actions}</div>}
				</div>
			</div>
		</div>
	);
};

/* ─── Action buttons ─────────────────────────────────────── */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const ModalBtnPrimary: FC<BtnProps> = ({ className, ...rest }) => (
	<button
		type="button"
		className={[s.btnBase, s.btnPrimary, className].filter(Boolean).join(" ")}
		{...rest}
	/>
);

export const ModalBtnDanger: FC<BtnProps> = ({ className, ...rest }) => (
	<button
		type="button"
		className={[s.btnBase, s.btnDanger, className].filter(Boolean).join(" ")}
		{...rest}
	/>
);

export const ModalBtnCancel: FC<BtnProps> = ({ className, ...rest }) => (
	<button
		type="button"
		className={[s.btnBase, s.btnCancel, className].filter(Boolean).join(" ")}
		{...rest}
	/>
);

/* ─── Icons ──────────────────────────────────────────────── */

const CloseIcon: FC = () => (
	<svg
		viewBox="0 0 11 11"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		width="11"
		height="11"
	>
		<title>close</title>
		<path d="M1.5 1.5l8 8M9.5 1.5l-8 8" />
	</svg>
);
