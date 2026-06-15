import { invoke } from "@tauri-apps/api/core";
import type { Service } from "../model/service.type";

/** List all microservices attached to a platform. */
export function readPlatformServicesApi(
	platformId: string,
): Promise<Service[]> {
	return invoke("read_platform_services", { platformId });
}
