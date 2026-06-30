import type { Doc } from "./doc-api.type";

export type CreateDocDTO = Omit<Doc, "id">;

export interface UpdateDocDTO {
	id: string;
	name: string;
	desc: string;
	tags: string[];
}
