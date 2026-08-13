import type { FC } from "react";
import { Link, useLocation } from "react-router";
import { cx } from "@/shared/lib/cx";
import { HistoryIcon, LogsIcon } from "@/shared/svg";
import s from "./Sidebar.module.css";

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
