import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

/* ─── Шевроны ─── */

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

export const ChevronLeftIcon: FC<IconProps> = ({
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
		<path d="M9 11L5 7l4-4" />
	</svg>
);

export const ChevronDownIcon: FC<IconProps> = ({
	size = 10,
	title,
	...rest
}) => (
	<svg
		viewBox="0 0 10 10"
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
		<path d="M2 4l3 3 3-3" />
	</svg>
);

/* ─── Стрелки ─── */

export const ArrowUpIcon: FC<IconProps> = ({ size = 13, title, ...rest }) => (
	<svg
		viewBox="0 0 13 13"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.6}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M6.5 10.5v-8M3 6l3.5-3.5L10 6" />
	</svg>
);

export const ArrowDownIcon: FC<IconProps> = ({ size = 13, title, ...rest }) => (
	<svg
		viewBox="0 0 13 13"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.6}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M6.5 2.5v8M3 7l3.5 3.5L10 7" />
	</svg>
);

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
