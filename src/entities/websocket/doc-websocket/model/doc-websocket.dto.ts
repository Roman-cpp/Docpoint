export interface CreateDocWebsocketDTO {
	name: string;
	desc: string;
	url: string;
	/** Microservice to attach the socket to. Omit to leave it unattached. */
	service_id?: string | null;
}

export interface UpdateDocWebsocketDTO {
	id: string;
	name: string;
	desc: string;
	url: string;
}
