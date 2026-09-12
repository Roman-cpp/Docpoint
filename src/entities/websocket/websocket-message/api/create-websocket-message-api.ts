import { invoke } from "@tauri-apps/api/core";
import type { CreateWebsocketMessageDTO } from "../model/websocket-message.dto";

/** Create an example frame for a WebSocket doc. Returns its id. */
export function createWebsocketMessageApi(
	message: CreateWebsocketMessageDTO,
): Promise<string> {
	return invoke("create_websocket_message", { message });
}
