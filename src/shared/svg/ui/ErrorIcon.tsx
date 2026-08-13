import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const ErrorIcon: FC<IconProps> = ({ size = 16, title, ...rest }) => (
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
		<circle cx="8" cy="8" r="6.5" />
		<path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
	</svg>
);
