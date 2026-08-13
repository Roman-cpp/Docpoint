import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const TrashIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
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
		<path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L11 4M6.5 7v4M9.5 7v4" />
	</svg>
);
