import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const NewWindowIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
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
		<path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5" />
		<path d="M12 9.5v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3" />
	</svg>
);
