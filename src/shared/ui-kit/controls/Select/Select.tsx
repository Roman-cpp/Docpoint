import type { FC, SelectHTMLAttributes } from "react";
import { cx } from "@/shared/lib/cx";
import { ChevronDownIcon } from "@/shared/svg";
import s from "./Select.module.css";

type Option = { value: string; label: string };

/** Размеры те же, что у [`Input`]: рядом в строке они должны совпадать по
 *  высоте до пикселя, поэтому шкала у контролов общая. */
type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
	options: Option[];
	size?: "sm" | "default" | "md";
	error?: boolean;
	placeholder?: string;
};

/**
 * Выпадающий список со своей стрелкой вместо системной.
 *
 * `className` и `style` описывают контрол целиком и достаются обёртке, а не
 * самому `<select>`: стрелка стоит абсолютно по правому краю обёртки, и заданная
 * полю ширина оставила бы её висеть в стороне.
 */
export const Select: FC<Props> = ({
	options,
	size = "default",
	error,
	placeholder,
	className,
	style,
	children,
	...rest
}) => (
	<div
		className={cx(
			s.wrap,
			size === "sm" ? s.sm : size === "md" ? s.md : "",
			error && s.error,
			className,
		)}
		style={style}
	>
		<select {...rest} className={s.select}>
			{placeholder && (
				<option value="" disabled>
					{placeholder}
				</option>
			)}
			{options.map((o) => (
				<option key={o.value} value={o.value}>
					{o.label}
				</option>
			))}
		</select>
		<span className={s.chevron}>
			<ChevronDownIcon />
		</span>
	</div>
);
