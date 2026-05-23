import type { FC, InputHTMLAttributes } from "react";
import s from "./Toggle.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
	label?: string;
	hint?: string;
};

export const Toggle: FC<Props> = ({
	label,
	hint,
	disabled,
	className,
	...rest
}) => (
	<label className={[s.label, disabled ? s.disabled : ""].filter(Boolean).join(" ")}>
		<input {...rest} type="checkbox" disabled={disabled} className={s.input} />
		<span className={s.track}>
			<span className={s.thumb} />
		</span>
		{(label || hint) && (
			<span>
				{label && <div className={s.text}>{label}</div>}
				{hint && <div className={s.hint}>{hint}</div>}
			</span>
		)}
	</label>
);
