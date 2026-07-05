/** A documented WebSocket connection: where to connect and what it is. */
export interface DocWebsocket {
	id: string;
	name: string;
	desc: string;
	/** `ws://` or `wss://` endpoint to connect to. */
	url: string;
	created_at: string;
}

export interface CreateDocWebsocketDTO {
	name: string;
	desc: string;
	url: string;
	/** Microservice to attach the socket to. Omit to leave it unattached. */
	service_id?: string | null;
}
