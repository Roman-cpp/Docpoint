import type { FC } from "react";
import s from "./RadioGroup.module.css";

type Option = {
	value: string;
	label: string;
	hint?: string;
	disabled?: boolean;
};

type Props = {
	name: string;
	value?: string;
	options: Option[];
	onChange?: (value: string) => void;
	inline?: boolean;
};

export const RadioGroup: FC<Props> = ({
	name,
	value,
	options,
	onChange,
	inline,
}) => (
	<div className={[s.group, inline ? s.inline : ""].filter(Boolean).join(" ")}>
		{options.map((opt) => (
			<label
				key={opt.value}
				className={[s.option, opt.disabled ? s.disabled : ""]
					.filter(Boolean)
					.join(" ")}
			>
				<input
					type="radio"
					name={name}
					value={opt.value}
					checked={value === opt.value}
					disabled={opt.disabled}
					onChange={() => onChange?.(opt.value)}
					className={s.input}
				/>
				<span className={s.dot}>
					<span className={s.inner} />
				</span>
				<span>
					<div className={s.text}>{opt.label}</div>
					{opt.hint && <div className={s.hint}>{opt.hint}</div>}
				</span>
			</label>
		))}
	</div>
);
