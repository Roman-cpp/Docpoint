import { invoke } from "@tauri-apps/api/core";
import type { WebsocketMessage } from "../model/websocket-message.entity";

/** List the saved example frames for a single WebSocket doc. */
export function getWebsocketMessagesApi(
	websocketId: string,
): Promise<WebsocketMessage[]> {
	return invoke("read_websocket_messages", { websocketId });
}
