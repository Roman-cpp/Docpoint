import type { FC, ReactNode } from "react";
import s from "./PlannedNote.module.css";

interface PlannedNoteProps {
	/** Что здесь будет — название будущего блока. */
	title: string;
	/** Одна строка о том, чего документации не хватает без него. */
	children: ReactNode;
}

/**
 * Место для того, что документация ещё не хранит: заголовков запроса, схем
 * авторизации, заголовков ответа. Блок стоит там, где появятся сами данные, —
 * так видно форму будущей страницы, а не пустоту на её месте.
 *
 * Как только поле доезжает до модели, соседний блок начинает его рисовать, а
 * эта заглушка убирается из страницы одной строкой.
 */
export const PlannedNote: FC<PlannedNoteProps> = ({ title, children }) => (
	<div className={s.note}>
		<div className={s.head}>
			<span className={s.title}>{title}</span>
			<span className={s.badge}>скоро</span>
		</div>
		<p className={s.text}>{children}</p>
	</div>
);
