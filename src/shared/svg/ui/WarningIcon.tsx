import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const WarningIcon: FC<IconProps> = ({ size = 16, title, ...rest }) => (
	<svg
		viewBox="0 0 16 16"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.75}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M8 2L14.5 13.5H1.5z" />
		<path d="M8 6.5v3" />
		<circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
	</svg>
);
