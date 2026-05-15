import type { DocaStore } from "./useDocaStore";

export const actionSelectGroup = (state: DocaStore) => state.selectGroup;
export const actionSelectEnvConfig = (state: DocaStore) =>
	state.selectEnvConfig;
export const actionSelectEndpoint = (state: DocaStore) => state.selectEndpoint;
export const actionSelectEntity = (state: DocaStore) => state.selectEntity;
export const actionSetAccessToken = (state: DocaStore) => state.setAccessToken;
export const actionImportDoca = (state: DocaStore) => state.importDoca;
export const actionDeleteDoca = (state: DocaStore) => state.deleteDoca;
