import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const BoltIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
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
		<path d="M8 1L2.5 8h4L6 13l5.5-7h-4z" />
	</svg>
);
