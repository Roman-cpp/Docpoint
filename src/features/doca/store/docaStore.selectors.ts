import type { DocaStore } from "./useDocaStore";

export const selectDoca = (state: DocaStore) => state.doca;
export const selectGroups = (state: DocaStore) => state.groups;
export const selectEnvConfigs = (state: DocaStore) => state.envConfigs;
export const selectSelectedGroup = (state: DocaStore) => state.selectedGroup;
export const selectSelectedSchema = (state: DocaStore) => state.selectedSchema;
export const selectSelectedEnvConfig = (state: DocaStore) =>
	state.selectedEnvConfig;
export const selectSelectedEndpoint = (state: DocaStore) =>
	state.selectedEndpoint;
export const selectSchemas = (state: DocaStore) => state.schemas;
export const selectAccessToken = (state: DocaStore) => state.accessToken;
