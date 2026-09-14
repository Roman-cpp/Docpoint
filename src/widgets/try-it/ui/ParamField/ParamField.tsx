import type { FC } from "react";
import s from "./ParamField.module.css";

interface ParamFieldProps {
	name: string;
	value: string;
	required?: boolean;
	type?: string;
	placeholder?: string;
	onChange: (value: string) => void;
}

/** Одно поле значения параметра: подпись со схемой сверху, ввод снизу. */
export const ParamField: FC<ParamFieldProps> = ({
	name,
	value,
	required,
	type,
	placeholder,
	onChange,
}) => (
	<label className={s.row}>
		<span className={s.label}>
			<span className={s.name}>{name}</span>
			{required && <span className={s.req}>*</span>}
			{type && <span className={s.type}>{type}</span>}
		</span>
		<input
			className={s.input}
			placeholder={placeholder}
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	</label>
);
