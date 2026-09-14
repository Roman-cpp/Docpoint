import { invoke } from "@tauri-apps/api/core";
import type { CreatePlatformDTO } from "../model/platform.dto";
import type { Platform } from "../model/platform.type";

export function createPlatformApi(
	platform: CreatePlatformDTO,
): Promise<Platform> {
	return invoke("create_platform", { platform });
}
