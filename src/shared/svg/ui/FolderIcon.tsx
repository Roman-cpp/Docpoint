import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const FolderIcon: FC<IconProps> = ({ size = 20, title, ...rest }) => (
	<svg
		viewBox="0 0 20 20"
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
		<path d="M2.5 5.5a1.5 1.5 0 0 1 1.5-1.5h3l1.5 1.8h6.5a1.5 1.5 0 0 1 1.5 1.5v6.7a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V5.5Z" />
	</svg>
);
