import { invoke } from "@tauri-apps/api/core";
import type { WebsocketMessage } from "../model/type";

/** List the saved example frames for a single WebSocket doc. */
export function readWebsocketMessagesApi(
	websocketId: string,
): Promise<WebsocketMessage[]> {
	return invoke("read_websocket_messages", { websocketId });
}
