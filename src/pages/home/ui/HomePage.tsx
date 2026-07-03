import type { FC } from "react";
import { Link } from "react-router";
import { Sidebar } from "@/pages/docs";
import { Header } from "@/widgets/header";
import s from "./HomePage.module.css";

interface Tool {
	name: string;
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
		desc: "Send HTTP requests, inspect responses and debug your APIs.",
		href: "/http-client",
		icon: "⇄",
		iconBg: "var(--blue-bg)",
		iconColor: "var(--blue)",
		accent: "var(--blue)",
	},
	{
		name: "WebSocket",
		desc: "Open WebSocket connections and exchange messages in real time.",
		href: "/websocket",
		icon: "⚡",
		iconBg: "var(--cat-bg)",
		iconColor: "var(--cat-ink)",
		accent: "var(--cat-ink)",
	},
	{
		name: "JSON",
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
			<div className={s.ovEyebrow}>Toolbox</div>
			<h1 className={s.ovTitle}>Инструменты</h1>
			<p className={s.ovSub}>
				Набор инструментов для работы с API: HTTP-клиент, WebSocket и JSON.
			</p>

			<div className={s.toolsGrid}>
				{TOOLS.map((t) => (
					<Link to={t.href} key={t.href} className={s.toolCard}>
						<div className={s.tcAccent} style={{ background: t.accent }} />
						<div
							className={s.tcIcon}
							style={{ background: t.iconBg, color: t.iconColor }}
						>
							{t.icon}
						</div>
						<div className={s.tcName}>{t.name}</div>
						<div className={s.tcDesc}>{t.desc}</div>
						<div className={s.tcFooter}>
							<span className={s.tcOpen}>Открыть →</span>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
};

/* ═══════════════ MAIN PAGE ═══════════════ */
export const HomePage: FC = () => {
	return (
		<div className={s.wrapper}>
			<Header section="home" activeLink="home" />

			<div className={s.shell}>
				<Sidebar />
				<Overview />
			</div>
		</div>
	);
};
