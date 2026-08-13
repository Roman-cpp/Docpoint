import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/** Лист с текстом — файл без собственного глифа. */
export const FileIcon: FC<IconProps> = ({ size = 20, title, ...rest }) => (
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
		<path d="M6.8 11h6.4M6.8 13.5h6.4" />
	</svg>
);
