import type { FC, SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/shared/svg";
import s from "./Select.module.css";

type Option = { value: string; label: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
	options: Option[];
	error?: boolean;
	placeholder?: string;
};

export const Select: FC<Props> = ({
	options,
	error,
	placeholder,
	className,
	children,
	...rest
}) => (
	<div className={[s.wrap, error ? s.error : ""].filter(Boolean).join(" ")}>
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
