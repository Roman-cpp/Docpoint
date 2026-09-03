import type { NodePayload } from "@/entities/catalog";

/** Заготовка нового узла: место в дереве добавляет вызывающая сторона. */
export interface NodeDraft {
	name: string;
	payload: NodePayload;
}

/**
 * Общий контракт окон создания. Вид узла определяет само окно, поэтому все
 * пять взаимозаменяемы и вызывающая сторона выбирает нужное по виду, не
 * подстраивая пропсы.
 */
export interface CreateNodeDialogProps {
	/** Имя каталога, в котором создаём; пусто — корень платформы. */
	parentName?: string;
	isSaving?: boolean;
	onClose: () => void;
	/** Ошибку показывает вызывающая мутация, поэтому окно на ней остаётся
	 *  открытым — занятое имя правят, а не набирают заново. */
	onCreate: (draft: NodeDraft) => Promise<unknown>;
}
