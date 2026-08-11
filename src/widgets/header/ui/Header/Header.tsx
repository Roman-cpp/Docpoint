import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type FC, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
	actionSelectEnvironment,
	selectEnvironments,
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { selectPlatform, usePlatformStore } from "@/features/platform";
import { getEnvDotColor } from "@/shared/lib/env-color";
import s from "./Header.module.css";

const NAV_LINKS: {
	label: string;
	href: string;
	active?: boolean;
	/** Показать пункт «Открыть в отдельном окне» */
	window?: boolean;
}[] = [
	{ label: "Docs", href: "/docs" },
	{ label: "HTTP Client", href: "/http-client" },
	{ label: "WebSocket", href: "/ws-client", window: true },
	{ label: "JSON", href: "/json-viewer", window: true },
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

/** Навигационная ссылка с контекстным меню «Открыть в отдельном окне» (ПКМ) */
const NavMenuLink: FC<{
	to: string;
	label: string;
	active?: boolean;
	onOpenWindow: () => void;
}> = ({ to, label, active, onOpenWindow }) => {
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const close = (e: MouseEvent) => {
			if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", close);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", close);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

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

export const Header: FC<HeaderProps> = ({ section }) => {
	const environments = useEnvironmentsStore(selectEnvironments);
	const selectedEnvironment = useEnvironmentsStore(selectSelectedEnvironment);
	const selectedPlatform = usePlatformStore(selectPlatform);
	const selectEnvironment = useEnvironmentsStore(actionSelectEnvironment);

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
						active
						onOpenWindow={() =>
							openInWindow(
								`platform-${selectedPlatform.id}`,
								`/platform-show/${selectedPlatform.id}`,
								`Platform — ${selectedPlatform.name}`,
							)
						}
					/>
				)}
				{NAV_LINKS.map((link) =>
					link.window ? (
						<NavMenuLink
							key={link.href}
							to={link.href}
							label={link.label}
							active={link.active}
							onOpenWindow={() =>
								openInWindow(`nav-${link.href}`, link.href, link.label)
							}
						/>
					) : (
						<Link
							key={link.href}
							to={link.href}
							className={`${s.pfNavLink} ${link.active ? s.active : ""}`}
						>
							{link.label}
						</Link>
					),
				)}
				{environments.length > 0 && (
					<Link
						key="/environments"
						to="/environments"
						className={`${s.pfNavLink} ${s.active}`}
					>
						Environments
					</Link>
				)}
				{/* <Link to="/profile" className={s.pfNavUser}>
					<span className={s.pfNavUserAvatar}>ИП</span>
					<span className={s.pfNavUserName}>Иван П.</span>
					<ChevronIcon />
				</Link> */}
			</div>
		</nav>
	);
};
