export { attachDocApi } from "./api/attachDocApi";
export { createServiceApi } from "./api/createServiceApi";
export { deleteServiceApi } from "./api/deleteServiceApi";
export { readAllServicesApi } from "./api/readAllServicesApi";
export { readPlatformServicesApi } from "./api/readPlatformServicesApi";
export { readServiceDocsApi } from "./api/readServiceDocsApi";
export { updateServiceApi } from "./api/updateServiceApi";
export type {
	CreateServiceDTO,
	UpdateServiceDTO,
} from "./model/service.dto";
export type { Service } from "./model/service.type";
export {
	serviceKeys,
	useAllServices,
	useAttachDoc,
	usePlatformServices,
	useServiceDocs,
} from "./store/useServicesStore";
