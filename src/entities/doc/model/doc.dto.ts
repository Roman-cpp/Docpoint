import type { Doc } from "./doc.type";

export type CreateDocDTO = Omit<Doc, "id">;

export interface UpdateDocDTO {
	id: string;
	name: string;
	desc: string;
	tags: string[];
}
