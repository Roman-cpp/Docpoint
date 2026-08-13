import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const NewFolderIcon: FC<IconProps> = ({ size = 15, title, ...rest }) => (
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
		<path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 1.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4Z" />
		<path d="M8 7.5v3M6.5 9h3" />
	</svg>
);
