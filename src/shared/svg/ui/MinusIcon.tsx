import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/** Промежуточное состояние — там, где галочка означала бы «выбрано всё». */
export const MinusIcon: FC<IconProps> = ({ size = 11, title, ...rest }) => (
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
		<path d="M3 7h8" />
	</svg>
);
