import type { FC, SelectHTMLAttributes } from "react";
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
			<ChevronIcon />
		</span>
	</div>
);

const ChevronIcon = () => (
	<svg
		viewBox="0 0 10 10"
		width={10}
		height={10}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>chevron</title>
		<path d="M2 4l3 3 3-3" />
	</svg>
);
