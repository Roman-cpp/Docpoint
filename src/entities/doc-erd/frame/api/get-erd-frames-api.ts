import { invoke } from "@tauri-apps/api/core";
import type { Frame } from "../model/frame.type";

interface GetErdFramesParams {
	docErdId: string;
}

/** Области диаграммы в порядке создания — в нём же холст их и рисует. */
export function getErdFramesApi({
	docErdId,
}: GetErdFramesParams): Promise<Frame[]> {
	return invoke("read_erd_frames", { docErdId });
}
