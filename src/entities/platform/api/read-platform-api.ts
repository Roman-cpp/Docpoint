import { invoke } from "@tauri-apps/api/core";
import type { Platform } from "../model/platform.entity";

export function readPlatformApi(id: string): Promise<Platform | null> {
	return invoke("read_platform", { id });
}
