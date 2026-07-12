import { invoke } from "@tauri-apps/api/core";
import type { UpdateEndpointDTO } from "../model/type";

export function updateEndpointApi(endpoint: UpdateEndpointDTO): Promise<void> {
	return invoke("update_endpoint", { endpoint });
}
