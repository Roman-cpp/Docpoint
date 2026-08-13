import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const HistoryIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
	<svg
		viewBox="0 0 14 14"
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
		<path d="M7 3.5V7l2.2 1.3" />
		<path d="M2.2 7a4.8 4.8 0 1 0 1.5-3.4" />
		<path d="M2 2v2.2h2.2" />
	</svg>
);
