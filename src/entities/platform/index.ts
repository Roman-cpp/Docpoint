export { createPlatformApi } from "./api/create-platform-api";
export { deletePlatformApi } from "./api/delete-platform-api";
export { getAllPlatformsApi } from "./api/get-all-platforms-api";
export { getPlatformApi } from "./api/get-platform-api";
export { updatePlatformApi } from "./api/update-platform-api";

export { PLATFORM_DESCRIPTION_FILE } from "./lib/description";
export type {
	CreatePlatformDTO,
	UpdatePlatformDTO,
} from "./model/platform.dto";
export type { Platform } from "./model/platform.entity";

export { platformKeys, usePlatformsStore } from "./store/usePlatformsStore";
