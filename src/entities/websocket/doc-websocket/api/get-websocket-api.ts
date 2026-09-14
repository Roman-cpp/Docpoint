import { invoke } from "@tauri-apps/api/core";
import type { DocWebsocket } from "../model/doc-websocket.type";

interface GetWebsocketParams {
	id: string;
}

/** Один сокет по id, или `null`, если его больше нет. */
export function getWebsocketApi({
	id,
}: GetWebsocketParams): Promise<DocWebsocket | null> {
	return invoke("read_websocket", { id });
}
