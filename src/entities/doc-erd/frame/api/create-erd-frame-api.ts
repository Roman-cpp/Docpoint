import { invoke } from "@tauri-apps/api/core";
import type { CreateFrameDTO } from "../model/frame.dto";

interface CreateErdFrameParams {
	docErdId: string;
	frame: CreateFrameDTO;
}

/** Заводит область на диаграмме и возвращает её id. */
export function createErdFrameApi({
	docErdId,
	frame,
}: CreateErdFrameParams): Promise<string> {
	return invoke("create_erd_frame", { docErdId, frame });
}
