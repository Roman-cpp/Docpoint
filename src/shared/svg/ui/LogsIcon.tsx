import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const LogsIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
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
		<rect x="2" y="2" width="10" height="10" rx="2" />
		<path d="M4.5 5.2h5M4.5 7h5M4.5 8.8h3" />
	</svg>
);
