export interface CreateMarkdownDTO {
	folder: string;
	name: string;
	content: string;
}

export interface UpdateMarkdownDTO {
	id: string;
	content: string;
}
