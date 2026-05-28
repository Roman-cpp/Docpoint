import type { FC, InputHTMLAttributes } from "react";
import s from "./Checkbox.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
	label?: string;
	hint?: string;
};

export const Checkbox: FC<Props> = ({
	label,
	hint,
	disabled,
	className,
	...rest
}) => (
	<label
		className={[s.label, disabled ? s.disabled : ""].filter(Boolean).join(" ")}
	>
		<input {...rest} type="checkbox" disabled={disabled} className={s.input} />
		<span className={s.box}>
			<svg
				className={s.check}
				viewBox="0 0 10 10"
				width={9}
				height={9}
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<title>check</title>
				<path d="M1.5 5.5l2.5 2.5 4.5-5" />
			</svg>
		</span>
		{(label || hint) && (
			<span>
				{label && <div className={s.text}>{label}</div>}
				{hint && <div className={s.hint}>{hint}</div>}
			</span>
		)}
	</label>
);
