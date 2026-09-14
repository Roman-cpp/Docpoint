import { invoke } from "@tauri-apps/api/core";
import type { UpdateEndpointRequestDTO } from "../model/endpoint-request.type";

/** Перезаписывает набор целиком: имя, режим и тело, заголовки и значения. */
export function updateEndpointRequestApi(
	request: UpdateEndpointRequestDTO,
): Promise<void> {
	return invoke("save_endpoint_request", { request });
}
