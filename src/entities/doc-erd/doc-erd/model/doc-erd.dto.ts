export interface CreateDocErdDTO {
	name: string;
	desc: string;
	/** Domain to attach the diagram to. Omit to leave it unattached. */
	domain_id?: string | null;
}
