import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const WarningIcon: FC<IconProps> = ({ size = 12, title, ...rest }) => (
	<svg
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.4}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M7 1.9 12.8 12H1.2L7 1.9Z" />
		<path d="M7 5.8v2.6" />
		<path d="M7 10.2h.01" />
	</svg>
);
