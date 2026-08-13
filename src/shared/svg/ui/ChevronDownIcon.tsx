import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const ChevronDownIcon: FC<IconProps> = ({
	size = 10,
	title,
	...rest
}) => (
	<svg
		viewBox="0 0 10 10"
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
		<path d="M2 4l3 3 3-3" />
	</svg>
);
