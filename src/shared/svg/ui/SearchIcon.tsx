import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const SearchIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
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
		<circle cx="6" cy="6" r="4.2" />
		<path d="M9.2 9.2L12 12" />
	</svg>
);
