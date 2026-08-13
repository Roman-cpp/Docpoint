import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const ChevronLeftIcon: FC<IconProps> = ({
	size = 14,
	title,
	...rest
}) => (
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
		<path d="M9 11L5 7l4-4" />
	</svg>
);
