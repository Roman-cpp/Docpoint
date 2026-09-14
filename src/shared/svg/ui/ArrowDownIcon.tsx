import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const ArrowDownIcon: FC<IconProps> = ({ size = 13, title, ...rest }) => (
	<svg
		viewBox="0 0 13 13"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.6}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M6.5 2.5v8M3 7l3.5 3.5L10 7" />
	</svg>
);
