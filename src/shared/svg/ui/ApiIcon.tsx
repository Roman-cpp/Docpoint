import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/** Фигурные скобки — документ, описывающий HTTP API. */
export const ApiIcon: FC<IconProps> = ({ size = 20, title, ...rest }) => (
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
		<path d="M8 4H7a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2 2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h1" />
		<path d="M12 4h1a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0-2 2v2a2 2 0 0 1-2 2h-1" />
	</svg>
);
