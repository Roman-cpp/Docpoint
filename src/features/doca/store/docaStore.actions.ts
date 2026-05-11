import type { DocaStore } from "./useDocaStore";

export const actionSelectGroup = (state: DocaStore) => state.selectGroup;
export const actionSelectEnvConfig = (state: DocaStore) =>
	state.selectEnvConfig;
export const actionSelectEndpoint = (state: DocaStore) => state.selectEndpoint;
export const actionSetAccessToken = (state: DocaStore) => state.setAccessToken;
