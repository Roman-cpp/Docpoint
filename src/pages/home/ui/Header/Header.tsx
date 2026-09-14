import type { FC } from "react";
import { Link } from "react-router";
import s from "./Header.module.css";

interface HeaderProps {
	section: string;
}

export const Header: FC<HeaderProps> = ({ section }) => {
	return (
		<nav className={s.pfNav}>
			<Link to="/" className={s.pfNavBrandLink}>
				<div className={s.pfNavBrand}>
					Docpoint
					<span className={s.pfNavSep} />
					<span className={s.pfNavSection}>{section}</span>
				</div>
			</Link>
		</nav>
	);
};
