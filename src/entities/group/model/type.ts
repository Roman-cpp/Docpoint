import type { CreateEndpointDTO, Endpoint } from "@/entities/endpoint";

export interface Group {
	id: string;
	label: string;
	endpoints: Endpoint[];
}

export type CreateGroupDTO = Omit<Group, "id" | "endpoints"> & {
	endpoints: CreateEndpointDTO[];
};
