import type { PlatformStore } from "./usePlatformStore";

export const selectPlatform = (state: PlatformStore) => state.platform;
