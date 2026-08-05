import { invoke } from "@tauri-apps/api/core";
import type { DocErd } from "../model/doc-erd.entity";

/** List the ERD diagrams attached to a single domain. */
export function getDomainErdsApi(domainId: string): Promise<DocErd[]> {
	return invoke("read_domain_erds", { domainId });
}
