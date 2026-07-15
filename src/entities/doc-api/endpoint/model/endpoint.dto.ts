import type { Endpoint } from "./endpoint.entity";

export type CreateEndpointDTO = Omit<Endpoint, "id">;
export type UpdateEndpointDTO = Omit<Endpoint, "responses">;
