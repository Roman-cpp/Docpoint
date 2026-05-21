import type { FC } from "react";
import { Link } from "react-router";
import s from "./Header.module.css";

export type NavLink =
	| "docs"
	| "explorer"
	| "http-client"
	| "entity"
	| "environments";

const NAV_LINKS: { id: NavLink; label: string; href: string }[] = [
	{ id: "docs", label: "API Docs", href: "/" },
	{ id: "http-client", label: "HTTP Client", href: "/http-client" },
];

interface HeaderProps {
	section: string;
	activeLink?: NavLink;
}

export const HeaderDocs: FC<HeaderProps> = ({ section, activeLink }) => {
	return (
		<nav className={s.nav}>
			<Link to="/" style={{ textDecoration: "none" }}>
				<div className={s.navBrand}>
					Docpoint
					<div className={s.navSep} />
					<span className={s.navSection}>{section}</span>
				</div>
			</Link>

			<div className={s.navLinks}>
				{NAV_LINKS.map(({ id, label, href }) => (
					<a
						key={id}
						className={`${s.navLink}${activeLink === id ? s.navLinkActive : ""}`}
						href={href}
					>
						{label}
					</a>
				))}
			</div>
		</nav>
	);
};
