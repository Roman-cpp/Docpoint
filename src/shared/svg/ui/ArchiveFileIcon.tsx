import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const ArchiveFileIcon: FC<IconProps> = ({
	size = 20,
	title,
	...rest
}) => (
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
		<path d="M5 2.5h7l3 3v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
		<path d="M11.5 2.5v3.2h3.2" />
		<path d="M8.4 5.5h1.4M8.4 7.5h1.4M8.4 9.5h1.4" />
	</svg>
);
