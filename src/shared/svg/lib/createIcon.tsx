import type { FC, ReactNode } from "react";
import type { IconProps } from "../model/icon.type";

/** Как рисуется глиф: сетка координат, размер по умолчанию и вид обводки. */
interface IconSpec {
	/** Координатная сетка глифа, например `"0 0 16 16"`. */
	viewBox: string;
	/** Размер в пикселях по умолчанию — тот, с которым иконка стоит чаще всего. */
	size?: number;
	/** Толщина обводки. У залитых глифов не используется. */
	strokeWidth?: number | string;
	/** Глиф залит цветом вместо обводки — точки, треугольники. */
	filled?: boolean;
}

/**
 * Собирает компонент иконки из глифа: одинаковая обводка по всему набору,
 * размер через `size`, подпись через `title`, остальные атрибуты `<svg>`
 * проходят насквозь.
 *
 * Глиф передаётся детьми `<path>` / `<circle>` / `<rect>` в координатах
 * `viewBox` — цвет и толщина линии приходят от обёртки, задавать их внутри
 * глифа не нужно.
 */
export function createIcon(
	name: string,
	spec: IconSpec,
	glyph: ReactNode,
): FC<IconProps> {
	const {
		viewBox,
		size: defaultSize = 14,
		strokeWidth = 1.4,
		filled = false,
	} = spec;

	const stroke = filled
		? null
		: {
				stroke: "currentColor",
				strokeWidth,
				strokeLinecap: "round" as const,
				strokeLinejoin: "round" as const,
			};

	const Icon: FC<IconProps> = ({
		size = defaultSize,
		title,
		children: _ignored,
		...rest
	}) => (
		// biome-ignore lint/a11y/noSvgWithoutTitle: подпись приходит пропом `title`, без неё иконка декоративная и закрыта от скринридеров через aria-hidden
		<svg
			viewBox={viewBox}
			width={size}
			height={size}
			fill={filled ? "currentColor" : "none"}
			{...stroke}
			aria-hidden={title ? undefined : true}
			{...rest}
		>
			{title ? <title>{title}</title> : null}
			{glyph}
		</svg>
	);
	Icon.displayName = name;
	return Icon;
}
