import { invoke } from "@tauri-apps/api/core";

export function attachDocApi(platformId: string, docId: string): Promise<void> {
	return invoke("attach_doc", { platformId, docId });
}
