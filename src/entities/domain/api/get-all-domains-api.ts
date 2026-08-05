import { invoke } from "@tauri-apps/api/core";
import type { Domain } from "../model/domain.entity";

/** List every domain across all platforms. */
export function getAllDomainsApi(): Promise<Domain[]> {
	return invoke("read_all_domains");
}
