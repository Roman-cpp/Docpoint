import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const CloseIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
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
		<path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
	</svg>
);
