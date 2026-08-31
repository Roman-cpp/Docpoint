import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const DatabaseIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
	<svg
		viewBox="0 0 16 16"
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
		<ellipse cx="8" cy="3.6" rx="5" ry="2.1" />
		<path d="M3 3.6v8.8c0 1.16 2.24 2.1 5 2.1s5-.94 5-2.1V3.6" />
		<path d="M3 8c0 1.16 2.24 2.1 5 2.1s5-.94 5-2.1" />
	</svg>
);
