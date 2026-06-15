import { invoke } from "@tauri-apps/api/core";
import type { UpdateServiceDTO } from "../model/service.dto";

/** Update an existing microservice. */
export function updateServiceApi(service: UpdateServiceDTO): Promise<void> {
	return invoke("update_service", { service });
}
