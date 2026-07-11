import type { FC, ReactNode } from "react";
import s from "./EditorialLayout.module.css";

interface EditorialLayoutProps {
	children?: ReactNode;
}

export const EditorialLayout: FC<EditorialLayoutProps> = ({ children }) => (
	<div className={s.frame}>
		<div className={s.page}>{children}</div>
	</div>
);
