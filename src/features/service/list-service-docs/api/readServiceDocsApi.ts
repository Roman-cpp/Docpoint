import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "@/entities/doc-api";

/** List the docs attached to a single microservice. */
export function readServiceDocsApi(serviceId: string): Promise<Doc[]> {
	return invoke("read_service_docs", { serviceId });
}
