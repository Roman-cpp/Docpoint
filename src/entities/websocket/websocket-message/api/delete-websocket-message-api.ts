import { invoke } from "@tauri-apps/api/core";

interface DeleteWebsocketMessageParams {
	messageId: string;
}

/** Delete an example frame by id. */
export function deleteWebsocketMessageApi({
	messageId,
}: DeleteWebsocketMessageParams): Promise<void> {
	return invoke("delete_websocket_message", { messageId });
}
