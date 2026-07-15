import { invoke } from "@tauri-apps/api/core";
import type { Service } from "../model/service.entity";

/** List every microservice across all platforms. */
export function readAllServicesApi(): Promise<Service[]> {
	return invoke("read_all_services");
}
