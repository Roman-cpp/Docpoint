import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const CheckIcon: FC<IconProps> = ({ size = 12, title, ...rest }) => (
	<svg
		viewBox="0 0 12 12"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={2}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M2 6l3 3 5-5" />
	</svg>
);
