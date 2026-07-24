export interface Service {
	id: string;
	name: string;
	desc: string;
	/** Owning platform — always set: a microservice cannot exist without one. */
	platformId: string;
}
