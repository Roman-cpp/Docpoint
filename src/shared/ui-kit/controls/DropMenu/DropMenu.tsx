import {
	createContext,
	type FC,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import s from "./DropMenu.module.css";

/* ─── Context ────────────────────────────────────────────────── */

interface DropMenuContextValue {
	open: boolean;
	setOpen: (open: boolean) => void;
	close: () => void;
}

const DropMenuContext = createContext<DropMenuContextValue | null>(null);

const useDropMenuContext = (component: string) => {
	const ctx = useContext(DropMenuContext);
	if (!ctx) {
		throw new Error(`<DropMenu.${component}> must be used inside <DropMenu>`);
	}
	return ctx;
};

/* ─── Icons ──────────────────────────────────────────────────── */

const CheckIcon: FC = () => (
	<svg
		width="12"
		height="12"
		viewBox="0 0 12 12"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M2 6l3 3 5-5" />
	</svg>
);

const ArrowIcon: FC = () => (
	<svg
		width="12"
		height="12"
		viewBox="0 0 12 12"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M4.5 3l4 3-4 3" />
	</svg>
);

/* ─── Root ───────────────────────────────────────────────────── */

export interface DropMenuProps {
	children: ReactNode;
	defaultOpen?: boolean;
}

const DropMenuRoot: FC<DropMenuProps> = ({ children, defaultOpen = false }) => {
	const [open, setOpen] = useState(defaultOpen);
	const wrapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		const onKey = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const close = useCallback(() => setOpen(false), []);

	const ctx = useMemo<DropMenuContextValue>(
		() => ({ open, setOpen, close }),
		[open, close],
	);

	return (
		<DropMenuContext.Provider value={ctx}>
			<div className={s.wrap} ref={wrapRef}>
				{children}
			</div>
		</DropMenuContext.Provider>
	);
};

/* ─── Trigger ────────────────────────────────────────────────── */

export interface DropMenuTriggerProps {
	children: ReactNode;
}

const DropMenuTrigger: FC<DropMenuTriggerProps> = ({ children }) => {
	const { open, setOpen } = useDropMenuContext("Trigger");
	return (
		<div
			className={s.trigger}
			role="button"
			tabIndex={0}
			aria-haspopup="menu"
			aria-expanded={open}
			onClick={() => setOpen(!open)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
					e.preventDefault();
					setOpen(!open);
				}
			}}
		>
			{children}
		</div>
	);
};

/* ─── Content ────────────────────────────────────────────────── */

export interface DropMenuContentProps {
	children: ReactNode;
	align?: "start" | "end";
}

const DropMenuContent: FC<DropMenuContentProps> = ({
	children,
	align = "end",
}) => {
	const { open } = useDropMenuContext("Content");
	if (!open) return null;
	return (
		<div
			className={[s.menu, align === "start" ? s.menuStart : s.menuEnd].join(
				" ",
			)}
			role="menu"
		>
			{children}
		</div>
	);
};

/* ─── Item ───────────────────────────────────────────────────── */

export interface DropMenuItemProps {
	children: ReactNode;
	shortcut?: string;
	checked?: boolean;
	arrow?: boolean;
	indicator?: string;
	disabled?: boolean;
	danger?: boolean;
	onClick?: () => void;
}

const DropMenuItem: FC<DropMenuItemProps> = ({
	children,
	shortcut,
	checked,
	arrow,
	indicator,
	disabled,
	danger,
	onClick,
}) => {
	const { close } = useDropMenuContext("Item");

	const activate = () => {
		if (disabled) return;
		onClick?.();
		close();
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (disabled) return;
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			activate();
		}
	};

	return (
		<div
			className={[
				s.item,
				disabled ? s.itemDisabled : "",
				danger ? s.itemDanger : "",
			]
				.filter(Boolean)
				.join(" ")}
			role="menuitem"
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			onClick={activate}
			onKeyDown={handleKeyDown}
		>
			<span className={s.itemLeft}>
				{checked && <CheckIcon />}
				{indicator && <span className={s.dot}>{indicator}</span>}
			</span>

			<span className={s.itemLabel}>{children}</span>

			{shortcut && <span className={s.shortcut}>{shortcut}</span>}
			{arrow && (
				<span className={s.arrow}>
					<ArrowIcon />
				</span>
			)}
		</div>
	);
};

/* ─── Separator ──────────────────────────────────────────────── */

const DropMenuSeparator: FC = () => (
	<div className={s.separator} role="separator" />
);

/* ─── Label ──────────────────────────────────────────────────── */

export interface DropMenuLabelProps {
	children: ReactNode;
}

const DropMenuLabel: FC<DropMenuLabelProps> = ({ children }) => (
	<div className={s.label}>{children}</div>
);

/* ─── Compound export ────────────────────────────────────────── */

export const DropMenu = Object.assign(DropMenuRoot, {
	Trigger: DropMenuTrigger,
	Content: DropMenuContent,
	Item: DropMenuItem,
	Separator: DropMenuSeparator,
	Label: DropMenuLabel,
});
