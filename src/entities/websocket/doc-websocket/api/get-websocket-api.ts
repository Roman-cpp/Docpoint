import { invoke } from "@tauri-apps/api/core";
import type { DocWebsocket } from "../model/doc-websocket.entity";

/** Один сокет по id, или `null`, если его больше нет. */
export function getWebsocketApi(id: string): Promise<DocWebsocket | null> {
	return invoke("read_websocket", { id });
}
