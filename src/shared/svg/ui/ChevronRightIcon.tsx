import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/** Шеврон вправо. Раскрытое состояние обычно рисуют поворотом через `style`. */
export const ChevronRightIcon: FC<IconProps> = ({
	size = 14,
	title,
	...rest
}) => (
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
		<path d="M5 3l4 4-4 4" />
	</svg>
);
