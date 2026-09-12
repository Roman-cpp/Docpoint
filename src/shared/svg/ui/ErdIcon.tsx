import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/** Две связанные таблицы — ERD-диаграмма. */
export const ErdIcon: FC<IconProps> = ({ size = 20, title, ...rest }) => (
	<svg
		viewBox="0 0 20 20"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.5}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<rect x="2.5" y="3" width="7" height="5.5" rx="1.2" />
		<path d="M2.5 5.2h7" />
		<rect x="10.5" y="11.5" width="7" height="5.5" rx="1.2" />
		<path d="M10.5 13.7h7" />
		<path d="M6 8.5v3.5a1.5 1.5 0 0 0 1.5 1.5h3" />
	</svg>
);
