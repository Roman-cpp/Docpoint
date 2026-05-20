import type { DocStore } from "./useDocStore";

export const actionSelectGroup = (state: DocStore) => state.selectGroup;
export const actionSelectEnvironment = (state: DocStore) =>
	state.selectEnvironment;
export const actionSelectEndpoint = (state: DocStore) => state.selectEndpoint;
export const actionSelectEntity = (state: DocStore) => state.selectEntity;
export const actionSetAccessToken = (state: DocStore) => state.setAccessToken;
export const actionImportDoc = (state: DocStore) => state.importDoc;
export const actionDeleteDoc = (state: DocStore) => state.deleteDoc;
export const actionUpdateEnvironment = (state: DocStore) => state.updateEnvironment;
export const actionAddVariableToEnv = (state: DocStore) => state.addVariableToEnv;
export const actionUpdateVariableInEnv = (state: DocStore) => state.updateVariableInEnv;
export const actionDeleteVariableFromEnv = (state: DocStore) => state.deleteVariableFromEnv;
