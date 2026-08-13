import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const NewFileIcon: FC<IconProps> = ({ size = 15, title, ...rest }) => (
	<svg
		viewBox="0 0 16 16"
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
		<path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9 1.5Z" />
		<path d="M9 1.5V5.5h4" />
		<path d="M8 8v4M6 10h4" />
	</svg>
);
