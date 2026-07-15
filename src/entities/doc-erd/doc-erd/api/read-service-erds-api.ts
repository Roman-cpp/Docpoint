import { invoke } from "@tauri-apps/api/core";
import type { DocErd } from "../model/doc-erd.entity";

/** List the ERD diagrams attached to a single microservice. */
export function readServiceErdsApi(serviceId: string): Promise<DocErd[]> {
	return invoke("read_service_erds", { serviceId });
}
