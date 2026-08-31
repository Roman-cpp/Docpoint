import type { Entity } from "./entity.entity";

/**
 * Позиция на холсте не входит ни в создание, ни в обновление схемы: её двигает
 * только сам холст, командой `update_schema_positions`. Иначе редактирование
 * полей затирало бы раскладку диаграммы.
 */
export type CreateEntityDTO = Omit<Entity, "id" | "posX" | "posY">;

export type UpdateEntityDTO = Omit<Entity, "posX" | "posY">;
