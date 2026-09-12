import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type FC, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
	actionSelectEnvironment,
	selectEnvironments,
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { selectPlatform, usePlatformStore } from "@/features/platform";
import { getEnvDotColor } from "@/shared/lib/env-color";
import { ChevronDownIcon, NewWindowIcon } from "@/shared/svg";
import s from "./Header.module.css";

/** Инструменты, свёрнутые в выпадающий список «Tools». */
const TOOL_LINKS: {
	label: string;
	href: string;
	/** Показать кнопку «Открыть в отдельном окне» */
	window?: boolean;
}[] = [
	{ label: "HTTP Client", href: "/http-client", window: true },
	{ label: "WebSocket", href: "/ws-client", window: true },
	{ label: "JSON", href: "/json-viewer", window: true },
	{ label: "Unix time", href: "/unix-time", window: true },
	{ label: "Generator", href: "/generator", window: true },
];

interface HeaderProps {
	section: string;
	activeLink?: string;
}

/** Открывает URL в отдельном окне Tauri (или фокусит уже открытое) */
const openInWindow = async (label: string, url: string, title: string) => {
	const existing = await WebviewWindow.getByLabel(label);
	if (existing) {
		await existing.setFocus();
		return;
	}
	const win = new WebviewWindow(label, {
		url,
		title,
		width: 1000,
		height: 700,
	});
	win.once("tauri://error", (e) => {
		console.error(`Failed to open window "${label}"`, e);
	});
};

/** Закрывает раскрытое меню по клику мимо него и по Escape. */
const useDismiss = (open: boolean, close: () => void) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (!ref.current?.contains(e.target as Node)) close();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") close();
		};
		document.addEventListener("mousedown", onClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClick);
			document.removeEventListener("keydown", onKey);
		};
	}, [open, close]);

	return ref;
};

/** Навигационная ссылка с контекстным меню «Открыть в отдельном окне» (ПКМ) */
const NavMenuLink: FC<{
	to: string;
	label: string;
	active?: boolean;
	onOpenWindow: () => void;
}> = ({ to, label, active, onOpenWindow }) => {
	const [open, setOpen] = useState(false);
	const menuRef = useDismiss(open, () => setOpen(false));

	return (
		<div className={s.pfNavMenu} ref={menuRef}>
			<Link
				to={to}
				className={`${s.pfNavLink} ${active ? s.active : ""}`}
				onContextMenu={(e) => {
					e.preventDefault();
					setOpen((v) => !v);
				}}
			>
				{label}
			</Link>
			<div className={`${s.pfNavDropdown} ${open ? s.open : ""}`}>
				<button
					type="button"
					className={s.pfNavDropdownItem}
					onClick={() => {
						setOpen(false);
						onOpenWindow();
					}}
				>
					Открыть в отдельном окне
				</button>
			</div>
		</div>
	);
};

/**
 * Выпадающий список «Tools»: инструменты, не привязанные к платформе. У части
 * из них рядом стоит кнопка открытия в отдельном окне — тем же действием, что
 * раньше пряталось в контекстном меню ссылки.
 */
const ToolsMenu: FC = () => {
	const [open, setOpen] = useState(false);
	const menuRef = useDismiss(open, () => setOpen(false));
	const { pathname } = useLocation();
	const active = TOOL_LINKS.some((link) => link.href === pathname);

	return (
		<div className={s.pfNavMenu} ref={menuRef}>
			<button
				type="button"
				className={`${s.pfNavLink} ${s.pfNavTrigger} ${active ? s.active : ""} ${
					open ? s.open : ""
				}`}
				aria-expanded={open}
				aria-haspopup="menu"
				onClick={() => setOpen((v) => !v)}
			>
				Tools
				<ChevronDownIcon size={9} className={s.pfNavTriggerIcon} />
			</button>

			<div
				className={`${s.pfNavDropdown} ${s.pfNavDropdownEnd} ${
					open ? s.open : ""
				}`}
				role="menu"
			>
				{TOOL_LINKS.map((link) => (
					<div key={link.href} className={s.pfNavDropdownRow}>
						<Link
							to={link.href}
							className={s.pfNavDropdownItem}
							role="menuitem"
							onClick={() => setOpen(false)}
						>
							{link.label}
						</Link>
						{link.window && (
							<button
								type="button"
								className={s.pfNavDropdownWindowBtn}
								aria-label={`Открыть «${link.label}» в отдельном окне`}
								title="Открыть в отдельном окне"
								onClick={() => {
									setOpen(false);
									openInWindow(`nav-${link.href}`, link.href, link.label);
								}}
							>
								<NewWindowIcon size={12} />
							</button>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

export const Header: FC<HeaderProps> = ({ section }) => {
	const environments = useEnvironmentsStore(selectEnvironments);
	const selectedEnvironment = useEnvironmentsStore(selectSelectedEnvironment);
	const selectedPlatform = usePlatformStore(selectPlatform);
	const selectEnvironment = useEnvironmentsStore(actionSelectEnvironment);
	// Жирным в навигации выделен только текущий раздел — одно правило на все
	// ссылки, иначе соседние пункты отличаются насыщенностью без причины.
	const { pathname } = useLocation();

	return (
		<nav className={s.pfNav}>
			<Link to="/" className={s.pfNavBrandLink}>
				<div className={s.pfNavBrand}>
					Docpoint
					<span className={s.pfNavSep} />
					<span className={s.pfNavSection}>{section}</span>
				</div>
			</Link>

			{environments.length > 0 && (
				<div className={s.pfNavEnv}>
					{environments.map((env) => {
						const isActive = env.id === selectedEnvironment?.id;
						return (
							<button
								key={env.id}
								type="button"
								className={`${s.pfEnvBtn} ${isActive ? s.active : ""}`}
								onClick={() => selectEnvironment(env.id)}
							>
								<span
									className={s.pfEnvDot}
									style={{ background: getEnvDotColor(env.env) }}
								/>
								{env.label}
							</button>
						);
					})}
				</div>
			)}

			<div className={s.pfNavLinks}>
				{selectedPlatform && (
					<NavMenuLink
						to={`/platform-show/${selectedPlatform.id}`}
						label="Platform"
						active={pathname.startsWith("/platform-show")}
						onOpenWindow={() =>
							openInWindow(
								`platform-${selectedPlatform.id}`,
								`/platform-show/${selectedPlatform.id}`,
								`Platform — ${selectedPlatform.name}`,
							)
						}
					/>
				)}
				{environments.length > 0 && (
					<Link
						key="/environments"
						to="/environments"
						className={`${s.pfNavLink} ${
							pathname === "/environments" ? s.active : ""
						}`}
					>
						Environments
					</Link>
				)}
				<ToolsMenu />
				{/* <Link to="/profile" className={s.pfNavUser}>
					<span className={s.pfNavUserAvatar}>ИП</span>
					<span className={s.pfNavUserName}>Иван П.</span>
					<ChevronIcon />
				</Link> */}
			</div>
		</nav>
	);
};
