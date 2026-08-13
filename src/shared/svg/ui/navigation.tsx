import type { FC } from "react";
import { createIcon } from "../lib/createIcon";
import type { IconProps } from "../model/icon.type";

/* ─── Шевроны ─── */

/** Шеврон вправо. Раскрытое состояние обычно рисуют поворотом через `style`. */
export const ChevronRightIcon = createIcon(
	"ChevronRightIcon",
	{ viewBox: "0 0 14 14", size: 14, strokeWidth: 1.5 },
	<path d="M5 3l4 4-4 4" />,
);

export const ChevronLeftIcon = createIcon(
	"ChevronLeftIcon",
	{ viewBox: "0 0 14 14", size: 14, strokeWidth: 1.5 },
	<path d="M9 11L5 7l4-4" />,
);

export const ChevronDownIcon = createIcon(
	"ChevronDownIcon",
	{ viewBox: "0 0 10 10", size: 10, strokeWidth: 1.5 },
	<path d="M2 4l3 3 3-3" />,
);

/* ─── Стрелки ─── */

export const ArrowUpIcon = createIcon(
	"ArrowUpIcon",
	{ viewBox: "0 0 13 13", size: 13, strokeWidth: 1.6 },
	<path d="M6.5 10.5v-8M3 6l3.5-3.5L10 6" />,
);

export const ArrowDownIcon = createIcon(
	"ArrowDownIcon",
	{ viewBox: "0 0 13 13", size: 13, strokeWidth: 1.6 },
	<path d="M6.5 2.5v8M3 7l3.5 3.5L10 7" />,
);

/**
 * Указатель сортировки: две стрелки, каждой можно дать свой класс, чтобы
 * подсветить активное направление.
 */
export const SortIcon: FC<
	IconProps & { upClassName?: string; downClassName?: string }
> = ({ size, upClassName, downClassName, title, ...rest }) => (
	// biome-ignore lint/a11y/noSvgWithoutTitle: подпись приходит пропом `title`, без неё иконка декоративная и закрыта от скринридеров через aria-hidden
	<svg
		viewBox="0 0 10 12"
		width={size ?? 10}
		height={size ?? 12}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.7}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden={title ? undefined : true}
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M2 4.5L5 1.5L8 4.5" className={upClassName} />
		<path d="M2 7.5L5 10.5L8 7.5" className={downClassName} />
	</svg>
);
