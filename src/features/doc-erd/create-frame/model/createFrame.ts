import { toast } from "@/core/toast";
import {
	createErdFrameApi,
	type Frame,
	type FrameRect,
} from "@/entities/doc-erd";

/**
 * Подпись, с которой область появляется на холсте. Форма правки открывается
 * сразу после рисования, так что дальше её обычно заменяют своей.
 */
export const DEFAULT_FRAME_TITLE = "Область";

interface CreateFrameParams {
	docErdId: string;
	rect: FrameRect;
}

/**
 * Заводит область по нарисованному на холсте прямоугольнику и возвращает её уже
 * с id — им холст адресует границы при сохранении.
 *
 * `null` означает, что команда не прошла и рисовать нечего: область, которой
 * нет в базе, исчезла бы при следующем открытии диаграммы.
 */
export async function createFrame({
	docErdId,
	rect,
}: CreateFrameParams): Promise<Frame | null> {
	try {
		const id = await createErdFrameApi({
			docErdId,
			frame: { title: DEFAULT_FRAME_TITLE, ...rect },
		});
		return { id, title: DEFAULT_FRAME_TITLE, ...rect };
	} catch (err) {
		toast({
			variant: "error",
			title: "Не удалось создать область",
			description: err instanceof Error ? err.message : String(err),
		});
		return null;
	}
}
