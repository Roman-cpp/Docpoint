import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/** Перенос в другое место: стрелка, выходящая за границу текущего каталога. */
export const MoveIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
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
		<path d="M8 2.5H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h5" />
		<path d="M6.5 8H14M11 5l3 3-3 3" />
	</svg>
);
