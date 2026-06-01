import { invoke } from "@tauri-apps/api/core";
import type { UpdatePlatformDTO } from "../model/platform.dto";

export function updatePlatformApi(platform: UpdatePlatformDTO): Promise<void> {
	return invoke("update_platform", { platform });
}
