import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const VideoFileIcon: FC<IconProps> = ({ size = 20, title, ...rest }) => (
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
		<rect x="2.5" y="4.5" width="11" height="11" rx="1.8" />
		<path d="M13.5 8.5 17.5 6v8l-4-2.5z" />
	</svg>
);
