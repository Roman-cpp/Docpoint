export { attachDocApi } from "./api/attach-doc-api";
export { createServiceApi } from "./api/create-service-api";
export { deleteServiceApi } from "./api/delete-service-api";
export { getAllServicesApi } from "./api/get-all-services-api";
export { getPlatformServicesApi } from "./api/get-platform-services-api";
export { updateServiceApi } from "./api/update-service-api";
export type {
	CreateServiceDTO,
	UpdateServiceDTO,
} from "./model/service.dto";
export type { Service } from "./model/service.entity";
export {
	serviceKeys,
	useAllServices,
	useAttachDoc,
	usePlatformServices,
} from "./store/useServicesStore";
