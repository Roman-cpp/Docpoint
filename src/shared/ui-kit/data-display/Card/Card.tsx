import type { FC, ReactNode } from "react";
import s from "./Card.module.css";

type Props = {
	title?: string;
	subtitle?: ReactNode;
	headerRight?: ReactNode;
	footer?: ReactNode;
	className?: string;
	children: ReactNode;
};

export const Card: FC<Props> = ({
	title,
	subtitle,
	headerRight,
	footer,
	className,
	children,
}) => (
	<div className={[s.card, className].filter(Boolean).join(" ")}>
		{title && (
			<div className={s.header}>
				<div className={s.headerLeft}>
					<h3 className={s.title}>{title}</h3>
					{subtitle && <span className={s.subtitle}>{subtitle}</span>}
				</div>
				{headerRight}
			</div>
		)}
		<div className={s.body}>{children}</div>
		{footer && <div className={s.footer}>{footer}</div>}
	</div>
);
