import type { FC, SelectHTMLAttributes } from "react";
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

export const Select: FC<Props> = ({
	options,
	size = "default",
	error,
	placeholder,
	className,
	children,
	...rest
}) => (
	<div
		className={[
			s.wrap,
			size === "sm" ? s.sm : size === "md" ? s.md : "",
			error ? s.error : "",
		]
			.filter(Boolean)
			.join(" ")}
	>
		<select
			{...rest}
			className={[s.select, className ?? ""].filter(Boolean).join(" ")}
		>
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
