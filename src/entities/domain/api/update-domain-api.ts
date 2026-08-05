import { invoke } from "@tauri-apps/api/core";
import type { UpdateDomainDTO } from "../model/domain.dto";

/** Update an existing domain. */
export function updateDomainApi(domain: UpdateDomainDTO): Promise<void> {
	return invoke("update_domain", { domain });
}
