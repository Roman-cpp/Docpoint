import { invoke } from "@tauri-apps/api/core";
import type { CreateDocWebsocketDTO } from "../model/doc-websocket.dto";

/** Create a WebSocket doc, optionally attached to a microservice. Returns its id. */
export function createWebsocketApi(
	websocket: CreateDocWebsocketDTO,
): Promise<string> {
	return invoke("create_websocket", { websocket });
}
