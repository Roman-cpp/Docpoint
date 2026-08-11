import { invoke } from "@tauri-apps/api/core";
import type { DocWebsocket } from "../model/doc-websocket.entity";

/** Every documented WebSocket, across all domains. */
export function getWebsocketsApi(): Promise<DocWebsocket[]> {
	return invoke("read_websockets");
}
