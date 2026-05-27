import {
	useState,
	useRef,
	useEffect,
	type FC,
	type ReactNode,
	type KeyboardEvent,
} from "react";
import s from "./DropMenu.module.css";

/* ─── Types ──────────────────────────────────────────────────── */

export type DropMenuItemDef =
	| {
			type?: "item";
			label: string;
			shortcut?: string;
			checked?: boolean;
			arrow?: boolean;
			indicator?: string;
			disabled?: boolean;
			danger?: boolean;
			onClick?: () => void;
	  }
	| { type: "separator" }
	| { type: "label"; label: string };

export interface DropMenuProps {
	trigger: ReactNode;
	items: DropMenuItemDef[];
	align?: "start" | "end";
}

/* ─── Icons ──────────────────────────────────────────────────── */

const CheckIcon: FC = () => (
	<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M2 6l3 3 5-5" />
	</svg>
);

const ArrowIcon: FC = () => (
	<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M4.5 3l4 3-4 3" />
	</svg>
);

/* ─── Component ──────────────────────────────────────────────── */

export const DropMenu: FC<DropMenuProps> = ({ trigger, items, align = "end" }) => {
	const [open, setOpen] = useState(false);
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

	const handleItemKey = (e: KeyboardEvent, onClick?: () => void) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onClick?.();
			setOpen(false);
		}
	};

	return (
		<div className={s.wrap} ref={wrapRef}>
			{/* Trigger */}
			<div
				className={s.trigger}
				role="button"
				tabIndex={0}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
						e.preventDefault();
						setOpen((v) => !v);
					}
				}}
			>
				{trigger}
			</div>

			{/* Menu */}
			{open && (
				<div
					className={[s.menu, align === "start" ? s.menuStart : s.menuEnd].join(" ")}
					role="menu"
				>
					{items.map((item, i) => {
						if (item.type === "separator") {
							// biome-ignore lint/suspicious/noArrayIndexKey: static list
							return <div key={i} className={s.separator} role="separator" />;
						}

						if (item.type === "label") {
							// biome-ignore lint/suspicious/noArrayIndexKey: static list
							return <div key={i} className={s.label}>{item.label}</div>;
						}

						const { label, shortcut, checked, arrow, indicator, disabled, danger, onClick } = item;

						return (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: static list
								key={i}
								className={[
									s.item,
									disabled ? s.itemDisabled : "",
									danger    ? s.itemDanger   : "",
								].filter(Boolean).join(" ")}
								role="menuitem"
								tabIndex={disabled ? -1 : 0}
								aria-disabled={disabled}
								onClick={() => {
									if (disabled) return;
									onClick?.();
									setOpen(false);
								}}
								onKeyDown={(e) => !disabled && handleItemKey(e, onClick)}
							>
								{/* Left slot — checkmark or indicator dot */}
								<span className={s.itemLeft}>
									{checked    && <CheckIcon />}
									{indicator  && <span className={s.dot}>{indicator}</span>}
								</span>

								<span className={s.itemLabel}>{label}</span>

								{/* Right slot — shortcut or arrow */}
								{shortcut && <span className={s.shortcut}>{shortcut}</span>}
								{arrow    && <span className={s.arrow}><ArrowIcon /></span>}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
