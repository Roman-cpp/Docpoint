import { invoke } from "@tauri-apps/api/core";
import type { CreateServiceDTO } from "../model/service.dto";
import type { Service } from "../model/service.entity";

/** Create a new microservice. */
export function createServiceApi(service: CreateServiceDTO): Promise<Service> {
	return invoke("create_service", { service });
}
