import type { FC, ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import s from "./DocChip.module.css";

/** Смысловая окраска чипа, а не цвет: `warn` — «осторожно», не «жёлтый». */
export type ChipTone = "neutral" | "accent" | "warn" | "danger" | "muted";

interface DocChipProps {
	tone?: ChipTone;
	/** Значение — код, а не слово: имя параметра, тип, заголовок. */
	mono?: boolean;
	icon?: ReactNode;
	/** Подпись перед значением: «по умолчанию», «формат». */
	label?: string;
	title?: string;
	children: ReactNode;
}

/**
 * Единственная мелкая метка страницы эндпоинта. Всё, что документация
 * добавляет к строке — тип, обязательность, формат, тег, признак
 * устаревания, — выглядит одинаково и различается только тоном.
 */
export const DocChip: FC<DocChipProps> = ({
	tone = "neutral",
	mono = false,
	icon,
	label,
	title,
	children,
}) => (
	<span className={cx(s.chip, s[tone], mono && s.mono)} title={title}>
		{icon}
		{label && <span className={s.label}>{label}</span>}
		{children}
	</span>
);
