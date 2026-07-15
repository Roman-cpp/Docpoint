import { invoke } from "@tauri-apps/api/core";
import type { Service } from "../model/service.entity";

/** List all microservices attached to a platform. */
export function getPlatformServicesApi(platformId: string): Promise<Service[]> {
	return invoke("read_platform_services", { platformId });
}
