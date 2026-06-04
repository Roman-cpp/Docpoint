import type { PlatformStore } from "./usePlatformStore";

export const actionFetchPlatform = (state: PlatformStore) =>
	state.fetchPlatform;
export const actionResetPlatform = (state: PlatformStore) =>
	state.resetPlatform;
