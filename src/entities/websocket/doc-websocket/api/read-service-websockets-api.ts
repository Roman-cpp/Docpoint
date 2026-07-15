import { invoke } from "@tauri-apps/api/core";
import type { DocWebsocket } from "../model/doc-websocket.entity";

/** List the WebSocket docs attached to a single microservice. */
export function readServiceWebsocketsApi(
	serviceId: string,
): Promise<DocWebsocket[]> {
	return invoke("read_service_websockets", { serviceId });
}
