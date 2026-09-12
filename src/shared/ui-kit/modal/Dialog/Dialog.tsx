import {
	type CSSProperties,
	createContext,
	type ReactNode,
	useContext,
} from "react";
import { CloseIcon } from "@/shared/svg";
import s from "./Dialog.module.css";

/* ------------------------------------------------------------------ */
/* Context — общий для всех частей, как в Radix-примитивах             */
/* ------------------------------------------------------------------ */

interface DialogContextValue {
	close: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogCtx(part: string): DialogContextValue {
	const ctx = useContext(DialogContext);
	if (!ctx) {
		throw new Error(
			`<Dialog.${part}> должен использоваться внутри <Dialog.Root>`,
		);
	}
	return ctx;
}

/* ------------------------------------------------------------------ */
/* Части                                                               */
/* ------------------------------------------------------------------ */

interface RootProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Ширина бокса в px, по умолчанию 392 */
	width?: number;
	children: ReactNode;
	className?: string;
}

function Root({ open, onOpenChange, width, children, className }: RootProps) {
	if (!open) return null;

	const close = () => onOpenChange(false);

	const boxStyle = width
		? ({ "--modal-width": `${width}px` } as CSSProperties)
		: undefined;

	return (
		<DialogContext.Provider value={{ close }}>
			<div
				className={s.overlay}
				onClick={(e) => {
					if (e.target === e.currentTarget) close();
				}}
				onKeyDown={(e) => {
					if (e.key === "Escape") close();
				}}
			>
				<div
					className={`${s.box}${className ? ` ${className}` : ""}`}
					style={boxStyle}
				>
					{children}
				</div>
			</div>
		</DialogContext.Provider>
	);
}

interface SimpleProps {
	children?: ReactNode;
	className?: string;
}

/** Шапка — grid `1fr auto`: слева Title/Subtitle, справа Close */
function Header({ children, className }: SimpleProps) {
	useDialogCtx("Header");
	return (
		<div className={`${s.header}${className ? ` ${className}` : ""}`}>
			{children}
		</div>
	);
}

/** Заголовок — левая колонка, первая строка */
function Title({ children, className }: SimpleProps) {
	useDialogCtx("Title");
	return (
		<span className={`${s.title}${className ? ` ${className}` : ""}`}>
			{children}
		</span>
	);
}

/** Подзаголовок — левая колонка, вторая строка */
function Subtitle({ children, className }: SimpleProps) {
	useDialogCtx("Subtitle");
	return (
		<span className={`${s.subtitle}${className ? ` ${className}` : ""}`}>
			{children}
		</span>
	);
}

/** Кнопка закрытия — правая колонка, закрывает модалку через контекст */
function Close({ className }: { className?: string }) {
	const { close } = useDialogCtx("Close");
	return (
		<button
			type="button"
			className={`${s.closeBtn}${className ? ` ${className}` : ""}`}
			onClick={close}
			aria-label="Закрыть"
		>
			<CloseIcon size={11} title="close" />
		</button>
	);
}

/** Тело — контент модалки */
function Body({ children, className }: SimpleProps) {
	useDialogCtx("Body");
	return (
		<div className={`${s.body}${className ? ` ${className}` : ""}`}>
			{children}
		</div>
	);
}

/** Футер — полоса с кнопками действий и разделителем сверху */
function Footer({ children, className }: SimpleProps) {
	useDialogCtx("Footer");
	return (
		<div className={`${s.footer}${className ? ` ${className}` : ""}`}>
			{children}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Кнопки действий                                                     */
/* ------------------------------------------------------------------ */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

function BtnPrimary({ className, ...rest }: BtnProps) {
	return (
		<button
			type="button"
			className={[s.btnBase, s.btnPrimary, className].filter(Boolean).join(" ")}
			{...rest}
		/>
	);
}

function BtnDanger({ className, ...rest }: BtnProps) {
	return (
		<button
			type="button"
			className={[s.btnBase, s.btnDanger, className].filter(Boolean).join(" ")}
			{...rest}
		/>
	);
}

function BtnCancel({ className, ...rest }: BtnProps) {
	return (
		<button
			type="button"
			className={[s.btnBase, s.btnCancel, className].filter(Boolean).join(" ")}
			{...rest}
		/>
	);
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Публичный API — составной компонент в стиле Radix                   */
/* ------------------------------------------------------------------ */

export const Dialog = {
	Root,
	Header,
	Title,
	Subtitle,
	Close,
	Body,
	Footer,
	BtnPrimary,
	BtnDanger,
	BtnCancel,
};
