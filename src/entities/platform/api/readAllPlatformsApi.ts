import { invoke } from "@tauri-apps/api/core";
import type { Platform } from "../model/platform.type";

export function readAllPlatformsApi(): Promise<Platform[]> {
	return invoke("read_platforms");
}
