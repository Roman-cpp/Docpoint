import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const LockIcon: FC<IconProps> = ({ size = 12, title, ...rest }) => (
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
		<rect x="2.75" y="6" width="8.5" height="6" rx="1.5" />
		<path d="M4.75 6V4.25a2.25 2.25 0 0 1 4.5 0V6" />
	</svg>
);
