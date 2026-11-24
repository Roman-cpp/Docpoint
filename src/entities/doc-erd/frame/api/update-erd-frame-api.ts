import { invoke } from "@tauri-apps/api/core";
import type { UpdateFrameDTO } from "../model/frame.dto";

/** Сохраняет подпись области. Границ не касается. */
export function updateErdFrameApi(frame: UpdateFrameDTO): Promise<void> {
	return invoke("update_erd_frame", { frame });
}
