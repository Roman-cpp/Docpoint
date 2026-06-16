/** An ERD diagram: a named canvas grouping entities and their relations. */
export interface DocErd {
	id: string;
	name: string;
	desc: string;
}

export interface CreateDocErdDTO {
	name: string;
	desc: string;
	/** Microservice to attach the diagram to. Omit to leave it unattached. */
	service_id?: string | null;
}
