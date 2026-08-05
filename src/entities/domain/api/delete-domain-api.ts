import { invoke } from "@tauri-apps/api/core";

/** Delete a domain by its id. */
export function deleteDomainApi(id: string): Promise<void> {
	return invoke("delete_domain", { id });
}
