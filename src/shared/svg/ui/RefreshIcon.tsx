import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const RefreshIcon: FC<IconProps> = ({ size = 13, title, ...rest }) => (
	<svg
		viewBox="0 0 14 14"
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
		<path d="M12.5 7a5.5 5.5 0 1 1-1.6-3.9" />
		<path d="M12.5 1.5V4H10" />
	</svg>
);
