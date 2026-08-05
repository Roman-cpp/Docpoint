export interface CreateDocWebsocketDTO {
	name: string;
	desc: string;
	url: string;
	/** Domain to attach the socket to. Omit to leave it unattached. */
	domain_id?: string | null;
}

export interface UpdateDocWebsocketDTO {
	id: string;
	name: string;
	desc: string;
	url: string;
}
