import { invoke } from "@tauri-apps/api/core";
import type { CreateDomainDTO } from "../model/domain.dto";
import type { Domain } from "../model/domain.entity";

/** Create a new domain. */
export function createDomainApi(domain: CreateDomainDTO): Promise<Domain> {
	return invoke("create_domain", { domain });
}
