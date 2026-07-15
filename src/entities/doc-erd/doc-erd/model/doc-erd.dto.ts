export interface CreateDocErdDTO {
	name: string;
	desc: string;
	/** Microservice to attach the diagram to. Omit to leave it unattached. */
	service_id?: string | null;
}
