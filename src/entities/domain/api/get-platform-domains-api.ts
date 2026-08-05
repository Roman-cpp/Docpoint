import { invoke } from "@tauri-apps/api/core";
import type { Domain } from "../model/domain.entity";

/** List all domains attached to a platform. */
export function getPlatformDomainsApi(platformId: string): Promise<Domain[]> {
	return invoke("read_platform_domains", { platformId });
}
