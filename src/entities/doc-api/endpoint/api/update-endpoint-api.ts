import { invoke } from "@tauri-apps/api/core";
import type { UpdateEndpointDTO } from "../model/endpoint.dto";

export function updateEndpointApi(endpoint: UpdateEndpointDTO): Promise<void> {
	return invoke("update_endpoint", { endpoint });
}
