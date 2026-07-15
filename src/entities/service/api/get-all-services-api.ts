import { invoke } from "@tauri-apps/api/core";
import type { Service } from "../model/service.entity";

/** List every microservice across all platforms. */
export function getAllServicesApi(): Promise<Service[]> {
	return invoke("read_all_services");
}
