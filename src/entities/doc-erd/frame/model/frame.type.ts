/**
 * Область на ERD-холсте: подписанный прямоугольник, которым таблицы
 * группируются по смыслу. Состава у области нет — ей принадлежат те таблицы,
 * что лежат внутри её границ, и вычисляет это холст.
 */
export interface Frame {
	id: string;
	title: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Новые границы одной области. Холст копит их и сбрасывает одной пачкой. */
export interface FrameBounds {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Прямоугольник, который холст отдал после рисования. Id у него ещё нет:
 * область заводит команда, и только после её ответа холст её рисует.
 */
export interface FrameRect {
	x: number;
	y: number;
	w: number;
	h: number;
}
