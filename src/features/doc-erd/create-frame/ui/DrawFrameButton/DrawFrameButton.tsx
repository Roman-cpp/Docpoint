import type { FC } from "react";
import { cx } from "@/shared/lib/cx";
import { FrameIcon } from "@/shared/svg";
import s from "./DrawFrameButton.module.css";

interface DrawFrameButtonProps {
	/** Идёт ли сейчас рисование: холст ждёт протаскивания. */
	active: boolean;
	onClick: () => void;
	disabled?: boolean;
}

/**
 * Включает режим рисования области. Прямоугольник пользователь протягивает по
 * холсту сам: область почти никогда не встаёт «по центру экрана», её место —
 * это и есть то, что она группирует.
 */
export const DrawFrameButton: FC<DrawFrameButtonProps> = ({
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
		<FrameIcon size={13} className={s.icon} />
		Область
	</button>
);
