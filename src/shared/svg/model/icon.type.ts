import type { SVGProps } from "react";

/**
 * Пропсы иконки набора: размер плюс всё, что принимает `<svg>` — className,
 * style, strokeWidth, обработчики. Проп перекрывает значение по умолчанию,
 * заданное иконкой.
 */
export interface IconProps
	extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "title"> {
	/** Сторона квадрата в пикселях. По умолчанию — размер, заданный иконкой. */
	size?: number | string;
	/**
	 * Нативный тултип при наведении. Иконки декоративны (`aria-hidden`) — имя
	 * элементу управления даёт его собственный `aria-label`, а не иконка внутри.
	 */
	title?: string;
}
