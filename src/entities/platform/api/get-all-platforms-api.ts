import { invoke } from "@tauri-apps/api/core";
import type { Platform } from "../model/platform.type";

export function getAllPlatformsApi(): Promise<Platform[]> {
	return invoke("read_platforms");
}
