import { invoke } from "@tauri-apps/api/core";
import type { UpdateWebsocketMessageDTO } from "../model/type";

/** Update an existing example frame. */
export function updateWebsocketMessageApi(
	message: UpdateWebsocketMessageDTO,
): Promise<void> {
	return invoke("update_websocket_message", { message });
}
