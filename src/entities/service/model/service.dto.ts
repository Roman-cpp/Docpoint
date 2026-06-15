export interface CreateServiceDTO {
	name: string;
	desc: string;
	platform_id: string | null;
}

export interface UpdateServiceDTO {
	id: string;
	name: string;
	desc: string;
	platform_id: string | null;
}
