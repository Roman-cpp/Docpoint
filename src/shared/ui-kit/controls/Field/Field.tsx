import type { FC, ReactNode } from "react";
import s from "./Field.module.css";

type Props = {
	label: ReactNode;
	hint?: ReactNode;
	error?: ReactNode;
	required?: boolean;
	layout?: "stack" | "row";
	children: ReactNode;
};

export const Field: FC<Props> = ({
	label,
	hint,
	error,
	required,
	layout = "stack",
	children,
}) => {
	const labelEl = (
		<div>
			<div className={s.label}>
				{label}
				{required && <span className={s.req}>*</span>}
			</div>
			{hint && !error && <div className={s.hint}>{hint}</div>}
			{error && <div className={s.error}>{error}</div>}
		</div>
	);

	if (layout === "row") {
		return (
			<div className={s.row}>
				{labelEl}
				{children}
			</div>
		);
	}

	return (
		<div className={s.field}>
			{labelEl}
			{children}
		</div>
	);
};
