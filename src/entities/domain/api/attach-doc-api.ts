import { invoke } from "@tauri-apps/api/core";

/** Attach an existing doc to a domain (sets docs.domain_id). */
export function attachDocApi(domainId: string, docId: string): Promise<void> {
	return invoke("attach_doc", { domainId, docId });
}
