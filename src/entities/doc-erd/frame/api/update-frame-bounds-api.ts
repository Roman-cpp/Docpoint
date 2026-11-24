import { invoke } from "@tauri-apps/api/core";
import type { FrameBounds } from "../model/frame.type";

/**
 * Сохраняет границы областей. Принимает пачку: холст копит перемещения и
 * растягивания и сбрасывает их одним вызовом, который на бэкенде выполняется
 * одной транзакцией.
 */
export function updateFrameBoundsApi(bounds: FrameBounds[]): Promise<void> {
	return invoke("update_erd_frame_bounds", { bounds });
}
