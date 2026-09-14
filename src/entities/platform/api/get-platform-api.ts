import { invoke } from "@tauri-apps/api/core";
import type { Platform } from "../model/platform.type";

interface GetPlatformParams {
	id: string;
}

export function getPlatformApi({
	id,
}: GetPlatformParams): Promise<Platform | null> {
	return invoke("read_platform", { id });
}
