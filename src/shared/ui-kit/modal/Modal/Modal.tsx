import type { FC, ReactNode } from "react";
import s from "./Modal.module.css";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	subtitle?: string;
	/** Кнопки действий — рендерятся в нижней полосе с разделителем */
	actions?: ReactNode;
	/** Ширина бокса в px, по умолчанию 392 */
	children: ReactNode;
};

export const Modal: FC<Props> = ({
	open,
	onOpenChange,
	title,
	subtitle,
	actions,
	children,
}) => {
	if (!open) return null;

	const close = () => onOpenChange(false);

	return (
		<div className={s.overlay} onClick={close}>
			<div className={s.box} onClick={(e) => e.stopPropagation()}>
				<div className={s.header}>
					<div className={s.headerText}>
						<span className={s.title}>{title}</span>
						{subtitle && <span className={s.subtitle}>{subtitle}</span>}
					</div>
					<button
						type="button"
						className={s.closeBtn}
						onClick={close}
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
