import type { DocaStore } from "./useDocaStore";

export const selectDocs = (state: DocaStore) => state.docs;
export const selectDoca = (state: DocaStore) => state.doca;
export const selectGroups = (state: DocaStore) => state.groups;
export const selectEnvConfigs = (state: DocaStore) => state.envConfigs;
export const selectSelectedGroup = (state: DocaStore) => state.selectedGroup;
export const selectSelectedEntity = (state: DocaStore) => state.selectedEntity;
export const selectSelectedEnvConfig = (state: DocaStore) => state.selectedEnvConfig;
export const selectSelectedEndpoint = (state: DocaStore) => state.selectedEndpoint;
export const selectEntities = (state: DocaStore) => state.entities;
export const selectAccessToken = (state: DocaStore) => state.accessToken;
