import type { CSSProperties, FC } from "react";
import { Link } from "react-router";
import { SidebarPlatform } from "@/widgets/sidebar";
import { Header } from "./../Header";
import s from "./HomePage.module.css";

interface Tool {
	name: string;
	tag: string;
	desc: string;
	href: string;
	icon: string;
	iconBg: string;
	iconColor: string;
	accent: string;
}

/* ═══════════════ TOOLS ═══════════════ */
const TOOLS: Tool[] = [
	{
		name: "HTTP Client",
		tag: "REST",
		desc: "Send HTTP requests, inspect responses and debug your APIs.",
		href: "/http-client",
		icon: "⇄",
		iconBg: "var(--blue-bg)",
		iconColor: "var(--blue)",
		accent: "var(--blue)",
	},
	{
		name: "WebSocket",
		tag: "Realtime",
		desc: "Open WebSocket connections and exchange messages in real time.",
		href: "/websocket",
		icon: "⚡",
		iconBg: "var(--cat-bg)",
		iconColor: "var(--cat-ink)",
		accent: "var(--cat-ink)",
	},
	{
		name: "JSON",
		tag: "Format",
		desc: "Format, validate and explore JSON payloads with ease.",
		href: "/json-viewer",
		icon: "{ }",
		iconBg: "var(--amber-bg)",
		iconColor: "var(--amber)",
		accent: "var(--amber)",
	},
];

/* ═══════════════ OVERVIEW ═══════════════ */
const Overview = () => {
	return (
		<div className={s.overview}>
			<div className={s.content}>
				<header className={s.hero}>
					<div className={s.ovEyebrow}>Toolbox</div>
					<h1 className={s.ovTitle}>Инструменты</h1>
					<p className={s.ovSub}>
						Набор инструментов для работы с API: HTTP-клиент, WebSocket и JSON.
					</p>
				</header>

				<div className={s.sectionLabel}>
					<span>Всё для работы с API</span>
					<span className={s.sectionCount}>{TOOLS.length}</span>
				</div>

				<div className={s.toolsGrid}>
					{TOOLS.map((t) => (
						<Link
							to={t.href}
							key={t.href}
							className={s.toolCard}
							style={{ "--accent": t.accent } as CSSProperties}
						>
							<div className={s.tcTop}>
								<div
									className={s.tcIcon}
									style={{ background: t.iconBg, color: t.iconColor }}
								>
									{t.icon}
								</div>
								<span className={s.tcTag}>{t.tag}</span>
							</div>
							<div className={s.tcName}>{t.name}</div>
							<div className={s.tcDesc}>{t.desc}</div>
							<div className={s.tcFooter}>
								<span className={s.tcOpen}>Открыть</span>
								<span className={s.tcArrow} aria-hidden>
									→
								</span>
							</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
};

/* ═══════════════ MAIN PAGE ═══════════════ */
export const HomePage: FC = () => {
	return (
		<div className={s.wrapper}>
			<Header section="home" />

			<div className={s.shell}>
				<SidebarPlatform />
				<Overview />
			</div>
		</div>
	);
};
