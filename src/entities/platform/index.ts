export { deletePlatformApi } from "./api/deletePlatformApi";
export { readAllPlatformsApi } from "./api/readAllPlatformsApi";
export { readPlatformApi } from "./api/readPlatformApi";
export { readPlatformDocsApi } from "./api/readPlatformDocsApi";
export { updatePlatformApi } from "./api/updatePlatformApi";
export { writePlatformApi } from "./api/writePlatformApi";

export type {
	CreatePlatformDTO,
	UpdatePlatformDTO,
} from "./model/platform.dto";
export type { Platform } from "./model/platform.type";

export {
	platformKeys,
	usePlatformDocs,
	usePlatformsStore,
} from "./store/usePlatformsStore";
