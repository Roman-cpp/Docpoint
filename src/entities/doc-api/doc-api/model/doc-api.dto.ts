import type { Doc } from "./doc-api.entity";

export type CreateDocDTO = Omit<Doc, "id">;

export interface UpdateDocDTO {
	id: string;
	name: string;
	desc: string;
	prefix: string;
	tags: string[];
}
