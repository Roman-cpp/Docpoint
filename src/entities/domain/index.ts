export { attachDocApi } from "./api/attach-doc-api";
export { createDomainApi } from "./api/create-domain-api";
export { deleteDomainApi } from "./api/delete-domain-api";
export { getAllDomainsApi } from "./api/get-all-domains-api";
export { getPlatformDomainsApi } from "./api/get-platform-domains-api";
export { updateDomainApi } from "./api/update-domain-api";
export type {
	CreateDomainDTO,
	UpdateDomainDTO,
} from "./model/domain.dto";
export type { Domain } from "./model/domain.entity";
export {
	domainKeys,
	useAllDomains,
	useAttachDoc,
	usePlatformDomains,
} from "./store/useDomainsStore";
