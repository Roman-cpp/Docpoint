/**
 * Полезная нагрузка создаваемого узла. Вид узла выводится из неё, поэтому
 * создать doc-ws без адреса или doc-api без префикса по ошибке нельзя.
 */
export type NodePayload =
	| { kind: "catalog" }
	| { kind: "docApi"; prefix: string }
	| { kind: "docWs"; url: string }
	| { kind: "docErd" }
	| { kind: "markdown"; content: string }
	/** Путь к файлу на диске: бэкенд заберёт его копией в своё хранилище. */
	| { kind: "file"; sourcePath: string };

export interface CreateNodeDTO {
	platformId: string;
	/** `null` — создать в корне платформы. */
	parentId: string | null;
	name: string;
	payload: NodePayload;
}

/** Переименование работает одинаково для каталога и для документа любого вида. */
export interface RenameNodeDTO {
	id: string;
	name: string;
}

export interface MoveNodeDTO {
	id: string;
	/** `null` — перенести в корень платформы. */
	parentId: string | null;
}
