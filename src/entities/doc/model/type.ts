export interface Doc {
	id: string;
	name: string;
	version: string;
	desc: string;
	tags: string[];
}

export type CreateDocDTO = Omit<Doc, "id">;
