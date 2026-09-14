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
