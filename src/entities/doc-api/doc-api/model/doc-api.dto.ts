/** Правка doc-api: имя уезжает в узел дерева, остальное — в поля документа.
 *  Бэкенд пишет и то и другое одной командой. */
export interface UpdateDocDTO {
	id: string;
	name: string;
	prefix: string;
}
