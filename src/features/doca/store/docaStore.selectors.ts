import type { DocaStore } from "./useDocaStore";

export const selectDoca = (state: DocaStore) => state.doca;
export const selectGroups = (state: DocaStore) => state.groups;
export const selectEnvConfigs = (state: DocaStore) => state.envConfigs;
export const selectSelectedGroup = (state: DocaStore) => state.selectGroup;
export const selectSelectedEnvConfig = (state: DocaStore) =>
	state.selectedEnvConfig;
export const selectSelectedEndpoint = (state: DocaStore) =>
	state.selectedEndpoint;
export const selectSchema = (state: DocaStore) => state.schema;
