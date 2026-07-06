/** A documented example frame for a socket ("Subscribe", "Ping", "Auth", …).
 *  Stored in `websocket_message`, owned by a `doc_websockets` row. */
export interface WebsocketMessage {
	id: string;
	websocket_id: string;
	name: string;
	/** JSON (or raw) payload template. */
	payload: string;
	desc: string;
}

export interface CreateWebsocketMessageDTO {
	websocket_id: string;
	name: string;
	payload: string;
	desc: string;
}

export interface UpdateWebsocketMessageDTO {
	id: string;
	name: string;
	payload: string;
	desc: string;
}
