/** Новая область: геометрия с холста плюс подпись. */
export interface CreateFrameDTO {
	title: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Правка подписи. Границы сюда не входят: их меняет холст, и у них свой путь —
 * `updateFrameBoundsApi`.
 */
export interface UpdateFrameDTO {
	id: string;
	title: string;
}
