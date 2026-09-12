import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/** Ручка перетаскивания: шесть точек, залитых цветом текста. */
export const GripIcon: FC<IconProps> = ({ size = 12, title, ...rest }) => (
	<svg
		viewBox="0 0 12 12"
		width={size}
		height={size}
		fill="currentColor"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<circle cx="4" cy="3" r="1" />
		<circle cx="4" cy="6" r="1" />
		<circle cx="4" cy="9" r="1" />
		<circle cx="8" cy="3" r="1" />
		<circle cx="8" cy="6" r="1" />
		<circle cx="8" cy="9" r="1" />
	</svg>
);
