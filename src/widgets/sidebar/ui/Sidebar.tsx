import type { FC } from "react";
import { Link, useLocation } from "react-router";
import { cx } from "@/shared/lib/cx";
import s from "./Sidebar.module.css";

/* ─── Icons ───────────────────────────────────────────────────── */

const HistoryIcon: FC = () => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 14 14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>history</title>
		<path d="M7 3.5V7l2.2 1.3" />
		<path d="M2.2 7a4.8 4.8 0 1 0 1.5-3.4" />
		<path d="M2 2v2.2h2.2" />
	</svg>
);

const LogsIcon: FC = () => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 14 14"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>logs</title>
		<rect x="2" y="2" width="10" height="10" rx="2" />
		<path d="M4.5 5.2h5M4.5 7h5M4.5 8.8h3" />
	</svg>
);

/* ─── Data ────────────────────────────────────────────────────── */

interface NavItem {
	to: string;
	label: string;
	Icon: FC;
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
	{
		label: "Мониторинг",
		items: [
			{ to: "/http-history", label: "Запросы", Icon: HistoryIcon },
			{ to: "/logs", label: "Логи", Icon: LogsIcon },
		],
	},
];

/* ─── Component ───────────────────────────────────────────────── */

export const Sidebar: FC = () => {
	const { pathname } = useLocation();

	return (
		<aside className={s.sidebar}>
			{SECTIONS.map((section) => (
				<div key={section.label} className={s.section}>
					<div className={s.sectionLabel}>{section.label}</div>
					<div className={s.group}>
						{section.items.map(({ to, label, Icon }) => (
							<Link
								key={to}
								to={to}
								className={cx(s.item, pathname === to && s.itemActive)}
							>
								<span className={s.icon}>
									<Icon />
								</span>
								{label}
							</Link>
						))}
					</div>
				</div>
			))}
		</aside>
	);
};
