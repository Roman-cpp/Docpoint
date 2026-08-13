import type { SVGProps } from "react";

/**
 * Пропсы иконки набора: размер плюс всё, что принимает `<svg>` — className,
 * style, обработчики.
 */
export interface IconProps
	extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "title"> {
	/** Сторона квадрата в пикселях. По умолчанию — размер, заданный иконкой. */
	size?: number | string;
	/**
	 * Подпись: доступное имя для скринридера и нативный тултип при наведении.
	 * Без неё иконка считается декоративной и скрывается (`aria-hidden`), так
	 * что подписывать нужно только те, что стоят без текстового ярлыка рядом.
	 */
	title?: string;
}
