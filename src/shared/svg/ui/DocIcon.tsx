import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const DocIcon: FC<IconProps> = ({ size = 13, title, ...rest }) => (
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
		<path d="M3 1.5h5L11 4.5v8H3z" />
		<path d="M8 1.5V4.5H11" />
		<path d="M5 7.5h4M5 9.5h4" />
	</svg>
);
