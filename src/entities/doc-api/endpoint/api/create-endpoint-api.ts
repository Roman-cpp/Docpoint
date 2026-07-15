import { invoke } from "@tauri-apps/api/core";
import type { CreateEndpointDTO } from "../model/endpoint.dto";

interface CreateEndpointArgs {
	docId: string;
	/** Существующая группа. Если не указана — создаётся новая по groupLabel. */
	groupId?: string;
	/** Название новой группы (когда groupId не задан). */
	groupLabel?: string;
	endpoint: CreateEndpointDTO;
}

export function createEndpointApi({
	docId,
	groupId,
	groupLabel,
	endpoint,
}: CreateEndpointArgs): Promise<void> {
	return invoke("create_endpoint", { docId, groupId, groupLabel, endpoint });
}
