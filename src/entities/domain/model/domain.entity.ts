export interface Domain {
	id: string;
	name: string;
	desc: string;
	/** Owning platform — always set: a domain cannot exist without one. */
	platformId: string;
}
