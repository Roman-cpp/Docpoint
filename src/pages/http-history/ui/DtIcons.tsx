import type { FC } from "react";
import { cx } from "@/shared/lib/cx";
import { CheckIcon, MinusIcon } from "@/shared/svg";
import s from "./DataTable.module.css";

/* ─── Checkbox ─── */
interface DtCheckboxProps {
	checked: boolean;
	indeterminate?: boolean;
	onChange: () => void;
	label: string;
}
export const DtCheckbox: FC<DtCheckboxProps> = ({
	checked,
	indeterminate,
	onChange,
	label,
}) => {
	const cls = indeterminate ? s.indeterminate : checked ? s.checked : undefined;
	return (
		// biome-ignore lint/a11y/useSemanticElements: нативный input потребовал бы визуально скрытого поля и переезда :focus-visible на :has(); кнопка с role="checkbox" уже даёт фокус, Space/Enter и озвучку состояния
		<button
			type="button"
			className={cx(s["dt-cb"], cls)}
			role="checkbox"
			aria-checked={indeterminate ? "mixed" : checked}
			aria-label={label}
			onClick={(e) => {
				e.stopPropagation();
				onChange();
			}}
		>
			{indeterminate ? <MinusIcon /> : checked ? <CheckIcon size={11} /> : null}
		</button>
	);
};
