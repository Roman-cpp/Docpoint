import type { FC, InputHTMLAttributes, Ref } from "react";
import { cx } from "@/shared/lib/cx";
import { CheckIcon } from "@/shared/svg";
import s from "./Checkbox.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
	label?: string;
	hint?: string;
	/** `sm` — для плотных строк таблиц, где рядом стоят мелкие поля. */
	size?: "sm" | "default";
	/** React 19 передаёт ref обычным пропом — его ждут формы. */
	ref?: Ref<HTMLInputElement>;
};

/**
 * Флажок: тихая рамка, пока не отмечен, и мягкая заливка с галочкой, когда
 * отмечен. Отметку держит сама галочка, а не контрастный квадрат, — в списке
 * из десятка строк такой флажок не перетягивает взгляд с текста, но состояние
 * видно с одного взгляда.
 */
export const Checkbox: FC<Props> = ({
	label,
	hint,
	size = "default",
	disabled,
	className,
	ref,
	...rest
}) => (
	<label
		className={cx(
			s.label,
			size === "sm" && s.sm,
			disabled && s.disabled,
			className,
		)}
	>
		<input
			{...rest}
			ref={ref}
			type="checkbox"
			disabled={disabled}
			className={s.input}
		/>
		<span className={s.box}>
			<CheckIcon className={s.check} size={size === "sm" ? 8 : 9} />
		</span>
		{(label || hint) && (
			<span>
				{label && <span className={s.text}>{label}</span>}
				{hint && <span className={s.hint}>{hint}</span>}
			</span>
		)}
	</label>
);
