import type { FC, ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import { PencilIcon } from "@/shared/svg";
import s from "./SectionHead.module.css";

interface SectionHeadProps {
	title: string;
	/** Сколько строк внутри: таблетка рядом с заголовком. `0` не рисуется. */
	count?: number;
	/** Пояснение под заголовком — чем эта секция отличается от соседней. */
	hint?: string;
	/** Крупный заголовок раздела или подзаголовок блока внутри него. */
	level?: "section" | "block";
	/** Правый край строки: кнопка правки, переключатели вида. */
	actions?: ReactNode;
	onEdit?: () => void;
}

/**
 * Заголовок раздела и блока — одна строка: название, счётчик, действия справа.
 * Кнопка правки живёт здесь же, поэтому любой блок документации правится из
 * той же точки, где читается.
 */
export const SectionHead: FC<SectionHeadProps> = ({
	title,
	count,
	hint,
	level = "block",
	actions,
	onEdit,
}) => (
	<div className={cx(s.head, level === "section" && s.section)}>
		<div className={s.titleRow}>
			{level === "section" ? (
				<h2 className={s.title}>{title}</h2>
			) : (
				<h3 className={s.title}>{title}</h3>
			)}
			{count !== undefined && count > 0 && (
				<span className={s.count}>{count}</span>
			)}
			<div className={s.actions}>
				{actions}
				{onEdit && (
					<button
						type="button"
						className={s.edit}
						onClick={onEdit}
						aria-label={`Редактировать: ${title}`}
					>
						<PencilIcon size={11} />
						Изменить
					</button>
				)}
			</div>
		</div>
		{hint && <p className={s.hint}>{hint}</p>}
	</div>
);
