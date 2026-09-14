import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/**
 * Указатель сортировки: две стрелки, каждой можно дать свой класс, чтобы
 * подсветить активное направление.
 */
export const SortIcon: FC<
	IconProps & { upClassName?: string; downClassName?: string }
> = ({ size, upClassName, downClassName, title, ...rest }) => (
	<svg
		viewBox="0 0 10 12"
		width={size ?? 10}
		height={size ?? 12}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.7}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M2 4.5L5 1.5L8 4.5" className={upClassName} />
		<path d="M2 7.5L5 10.5L8 7.5" className={downClassName} />
	</svg>
);
