import type { FC } from "react";
import { cx } from "@/shared/lib/cx";
import { DatabaseIcon } from "@/shared/svg";
import s from "./CompareWithDbButton.module.css";

interface CompareWithDbButtonProps {
	/** Идёт ли сравнение: тогда кнопка его выключает. */
	active: boolean;
	onClick: () => void;
	disabled?: boolean;
}

export const CompareWithDbButton: FC<CompareWithDbButtonProps> = ({
	active,
	onClick,
	disabled,
}) => (
	<button
		type="button"
		className={cx(s.btn, active && s.active)}
		onClick={onClick}
		disabled={disabled}
		aria-pressed={active}
	>
		<DatabaseIcon size={13} className={s.icon} />
		{active ? "Сравнение" : "Сравнить с базой"}
	</button>
);
