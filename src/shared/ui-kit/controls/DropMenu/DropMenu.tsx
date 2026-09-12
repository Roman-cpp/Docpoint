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
import { CheckIcon, ChevronRightIcon } from "@/shared/svg";
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
					<ChevronRightIcon size={12} />
				</span>
			)}
		</div>
	);
};

/* ─── Submenu ────────────────────────────────────────────────── */

interface SubMenuContextValue {
	open: boolean;
	setOpen: (open: boolean) => void;
}

const SubMenuContext = createContext<SubMenuContextValue | null>(null);

const useSubMenuContext = (component: string) => {
	const ctx = useContext(SubMenuContext);
	if (!ctx) {
		throw new Error(
			`<DropMenu.${component}> must be used inside <DropMenu.Sub>`,
		);
	}
	return ctx;
};

export interface DropMenuSubProps {
	children: ReactNode;
}

const DropMenuSub: FC<DropMenuSubProps> = ({ children }) => {
	const [open, setOpen] = useState(false);
	const ctx = useMemo<SubMenuContextValue>(() => ({ open, setOpen }), [open]);
	return (
		<SubMenuContext.Provider value={ctx}>
			<div
				className={s.sub}
				onMouseEnter={() => setOpen(true)}
				onMouseLeave={() => setOpen(false)}
			>
				{children}
			</div>
		</SubMenuContext.Provider>
	);
};

export interface DropMenuSubTriggerProps {
	children: ReactNode;
	indicator?: string;
	disabled?: boolean;
}

const DropMenuSubTrigger: FC<DropMenuSubTriggerProps> = ({
	children,
	indicator,
	disabled,
}) => {
	const { open, setOpen } = useSubMenuContext("SubTrigger");
	return (
		<div
			className={[s.item, disabled ? s.itemDisabled : ""]
				.filter(Boolean)
				.join(" ")}
			role="menuitem"
			aria-haspopup="menu"
			aria-expanded={open}
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			onClick={() => !disabled && setOpen(!open)}
			onKeyDown={(e) => {
				if (disabled) return;
				if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
					e.preventDefault();
					setOpen(true);
				}
				if (e.key === "ArrowLeft") setOpen(false);
			}}
		>
			<span className={s.itemLeft}>
				{indicator && <span className={s.dot}>{indicator}</span>}
			</span>
			<span className={s.itemLabel}>{children}</span>
			<span className={s.arrow}>
				<ChevronRightIcon size={12} />
			</span>
		</div>
	);
};

export interface DropMenuSubContentProps {
	children: ReactNode;
}

const DropMenuSubContent: FC<DropMenuSubContentProps> = ({ children }) => {
	const { open } = useSubMenuContext("SubContent");
	if (!open) return null;
	return (
		<div className={s.submenu} role="menu">
			{children}
		</div>
	);
};

/* ─── Separator ──────────────────────────────────────────────── */

const DropMenuSeparator: FC = () => <div className={s.separator} />;

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
	Sub: DropMenuSub,
	SubTrigger: DropMenuSubTrigger,
	SubContent: DropMenuSubContent,
	Separator: DropMenuSeparator,
	Label: DropMenuLabel,
});
