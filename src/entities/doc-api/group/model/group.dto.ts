import type { CreateEndpointDTO } from "@/entities/doc-api/endpoint/@x/doc-api/group";
import type { Group } from "./group.type";

export type CreateGroupDTO = Omit<Group, "id" | "endpoints"> & {
	endpoints: CreateEndpointDTO[];
};
