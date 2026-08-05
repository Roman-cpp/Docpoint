import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "@/entities/doc-api";

/** List the docs attached to a single domain. */
export function readDomainDocsApi(domainId: string): Promise<Doc[]> {
	return invoke("read_domain_docs", { domainId });
}
