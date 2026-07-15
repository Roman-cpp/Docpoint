import type { CreateEndpointDTO } from "../../endpoint";
import type { Group } from "./group.entity";

export type CreateGroupDTO = Omit<Group, "id" | "endpoints"> & {
	endpoints: CreateEndpointDTO[];
};
