import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "@/entities/doc";

export function readPlatformDocsApi(platformId: string): Promise<Doc[]> {
	return invoke("read_platform_docs", { platformId });
}
