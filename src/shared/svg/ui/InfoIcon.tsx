import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const InfoIcon: FC<IconProps> = ({ size = 16, title, ...rest }) => (
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
		<path d="M8 7.5v3.5" />
		<circle cx="8" cy="5.5" r="0.5" fill="currentColor" />
	</svg>
);
