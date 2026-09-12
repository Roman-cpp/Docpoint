import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const ImageFileIcon: FC<IconProps> = ({ size = 20, title, ...rest }) => (
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
		<rect x="3" y="3.5" width="14" height="13" rx="1.8" />
		<circle cx="7.5" cy="8" r="1.4" />
		<path d="M3.5 13.5 7.5 10l3 2.5 3-3 3 3.2" />
	</svg>
);
