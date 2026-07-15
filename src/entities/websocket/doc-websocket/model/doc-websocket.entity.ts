/** A documented WebSocket connection: where to connect and what it is. */
export interface DocWebsocket {
	id: string;
	name: string;
	desc: string;
	/** `ws://` or `wss://` endpoint to connect to. */
	url: string;
	created_at: string;
}
