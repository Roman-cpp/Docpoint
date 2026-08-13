import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const EyeIcon: FC<IconProps> = ({ size = 12, title, ...rest }) => (
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
		<path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
		<circle cx="7" cy="7" r="1.7" />
	</svg>
);
