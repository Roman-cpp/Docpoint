import { invoke } from "@tauri-apps/api/core";

/** Delete an example frame by id. */
export function deleteWebsocketMessageApi(messageId: string): Promise<void> {
	return invoke("delete_websocket_message", { messageId });
}
