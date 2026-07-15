import type { Entity } from "./entity.entity";

export type CreateEntityDTO = Omit<Entity, "id">;

export type UpdateEntityDTO = Entity;
