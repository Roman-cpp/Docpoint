import type { NodeKind } from "./catalog-node.entity";

/**
 * Полезная нагрузка создаваемого узла. Вид узла выводится из неё, поэтому
 * создать doc-ws без адреса или doc-api без версии по ошибке нельзя.
 */
export type NodePayload =
	| { kind: "catalog" }
	| { kind: "docApi"; version: string; prefix: string; tags: string[] }
	| { kind: "docWs"; url: string }
	| { kind: "docErd" }
	| { kind: "markdown"; content: string };

export interface CreateNodeDTO {
	platformId: string;
	/** `null` — создать в корне платформы. */
	parentId: string | null;
	name: string;
	desc: string;
	payload: NodePayload;
}

/** Переименование работает одинаково для каталога и для документа любого вида. */
export interface RenameNodeDTO {
	id: string;
	name: string;
	desc: string;
}

export interface MoveNodeDTO {
	id: string;
	/** `null` — перенести в корень платформы. */
	parentId: string | null;
}

/** Вид узла, который создаст эта нагрузка. */
export const payloadKind = (payload: NodePayload): NodeKind => payload.kind;
