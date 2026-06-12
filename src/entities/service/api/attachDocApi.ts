import { invoke } from "@tauri-apps/api/core";

/** Attach an existing doc to a microservice (sets docs.service_id). */
export function attachDocApi(serviceId: string, docId: string): Promise<void> {
	return invoke("attach_doc", { serviceId, docId });
}
