import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const FrameIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
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
		<path d="M2.5 3h5" />
		<rect x="2.5" y="5.5" width="11" height="8" rx="1.5" />
	</svg>
);
