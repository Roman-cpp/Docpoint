export { deletePlatformApi } from "./api/delete-platform-api";
export { readAllPlatformsApi } from "./api/read-all-platforms-api";
export { readPlatformApi } from "./api/read-platform-api";
export { updatePlatformApi } from "./api/update-platform-api";
export { writePlatformApi } from "./api/write-platform-api";

export type {
	CreatePlatformDTO,
	UpdatePlatformDTO,
} from "./model/platform.dto";
export type { Platform } from "./model/platform.entity";

export { platformKeys, usePlatformsStore } from "./store/usePlatformsStore";
