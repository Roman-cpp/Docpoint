import {
	type CSSProperties,
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import s from "./ContextMenu.module.css";

/* ------------------------------------------------------------------ */
/* Context — общий для всех частей, как в Radix-примитивах             */
/* ------------------------------------------------------------------ */

interface ContextMenuContextValue {
	close: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

function useContextMenuCtx(part: string): ContextMenuContextValue {
	const ctx = useContext(ContextMenuContext);
	if (!ctx) {
		throw new Error(
			`<ContextMenu.${part}> должен использоваться внутри <ContextMenu.Root>`,
		);
	}
	return ctx;
}

/* ------------------------------------------------------------------ */
/* Root — backdrop + позиционированное по координатам меню             */
/* ------------------------------------------------------------------ */

interface RootProps {
	open: boolean;
	/** Координата курсора по X (clientX) */
	x: number;
	/** Координата курсора по Y (clientY) */
	y: number;
	onClose: () => void;
	/** Минимальная ширина меню в px, по умолчанию 200 */
	minWidth?: number;
	children: ReactNode;
	className?: string;
}

/** Отступ меню от края viewport при clamp-позиционировании */
const EDGE_GAP = 8;

function Root({
	open,
	x,
	y,
	onClose,
	minWidth,
	children,
	className,
}: RootProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ left: x, top: y });

	// Clamp позиции внутри viewport, чтобы меню у края экрана не обрезалось.
	useLayoutEffect(() => {
		if (!open) return;
		const el = menuRef.current;
		if (!el) return;
		const { offsetWidth: w, offsetHeight: h } = el;
		const maxLeft = window.innerWidth - w - EDGE_GAP;
		const maxTop = window.innerHeight - h - EDGE_GAP;
		setPos({
			left: Math.max(EDGE_GAP, Math.min(x, maxLeft)),
			top: Math.max(EDGE_GAP, Math.min(y, maxTop)),
		});
	}, [open, x, y]);

	// Закрытие по Escape.
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	const menuStyle: CSSProperties = {
		left: pos.left,
		top: pos.top,
		...(minWidth ? { minWidth } : null),
	};

	return (
		<ContextMenuContext.Provider value={{ close: onClose }}>
			<button
				type="button"
				className={s.backdrop}
				aria-label="Закрыть меню"
				onClick={onClose}
				onContextMenu={(e) => {
					e.preventDefault();
					onClose();
				}}
			/>
			<div
				ref={menuRef}
				className={`${s.menu}${className ? ` ${className}` : ""}`}
				style={menuStyle}
				role="menu"
			>
				{children}
			</div>
		</ContextMenuContext.Provider>
	);
}

/* ------------------------------------------------------------------ */
/* Item                                                                */
/* ------------------------------------------------------------------ */

interface ItemProps {
	children: ReactNode;
	icon?: ReactNode;
	danger?: boolean;
	disabled?: boolean;
	onSelect?: () => void;
	className?: string;
}

function Item({
	children,
	icon,
	danger,
	disabled,
	onSelect,
	className,
}: ItemProps) {
	const { close } = useContextMenuCtx("Item");

	const activate = () => {
		if (disabled) return;
		onSelect?.();
		close();
	};

	return (
		<button
			type="button"
			role="menuitem"
			disabled={disabled}
			className={[s.item, danger ? s.itemDanger : "", className]
				.filter(Boolean)
				.join(" ")}
			onClick={activate}
		>
			{icon && <span className={s.itemIcon}>{icon}</span>}
			<span className={s.itemLabel}>{children}</span>
		</button>
	);
}

/* ------------------------------------------------------------------ */
/* Separator / Label                                                   */
/* ------------------------------------------------------------------ */

function Separator() {
	return <div className={s.separator} />;
}

function Label({ children }: { children: ReactNode }) {
	return <div className={s.label}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Публичный API — составной компонент в стиле Radix                   */
/* ------------------------------------------------------------------ */

export const ContextMenu = {
	Root,
	Item,
	Separator,
	Label,
};
