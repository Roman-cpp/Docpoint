import { invoke } from "@tauri-apps/api/core";
import type { CreateDocErdDTO } from "../model/doc-erd.dto";

/** Create an ERD diagram, optionally attached to a microservice. Returns its id. */
export function createErdApi(erd: CreateDocErdDTO): Promise<string> {
	return invoke("create_erd", { erd });
}
