import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/** Двунаправленные стрелки — документ WebSocket-подключения. */
export const SocketIcon: FC<IconProps> = ({ size = 20, title, ...rest }) => (
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
		<path d="M3.5 7.5h13l-3-3" />
		<path d="M16.5 12.5h-13l3 3" />
	</svg>
);
