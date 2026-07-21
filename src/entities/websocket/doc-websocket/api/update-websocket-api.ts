import { invoke } from "@tauri-apps/api/core";
import type { UpdateDocWebsocketDTO } from "../model/doc-websocket.dto";

/** Update a WebSocket doc's name, description and URL. */
export function updateWebsocketApi(
	websocket: UpdateDocWebsocketDTO,
): Promise<void> {
	return invoke("update_websocket", { websocket });
}
