import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const ShareIcon: FC<IconProps> = ({ size = 11, title, ...rest }) => (
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
		<circle cx="3.6" cy="7" r="1.6" />
		<circle cx="10.4" cy="3.4" r="1.6" />
		<circle cx="10.4" cy="10.6" r="1.6" />
		<path d="M5 6.2l4-2M5 7.8l4 2" />
	</svg>
);
