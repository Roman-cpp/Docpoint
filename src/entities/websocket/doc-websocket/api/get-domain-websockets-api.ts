import { invoke } from "@tauri-apps/api/core";
import type { DocWebsocket } from "../model/doc-websocket.entity";

/** List the WebSocket docs attached to a single domain. */
export function getDomainWebsocketsApi(
	domainId: string,
): Promise<DocWebsocket[]> {
	return invoke("read_domain_websockets", { domainId });
}
