/** Правка doc-api: имя и описание уезжают в узел дерева, остальное — в поля
 *  документа. Бэкенд пишет и то и другое одной командой. */
export interface UpdateDocDTO {
	id: string;
	name: string;
	desc: string;
	prefix: string;
	tags: string[];
}
