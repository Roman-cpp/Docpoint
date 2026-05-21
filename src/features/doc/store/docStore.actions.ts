import type { DocStore } from "./useDocStore";

export const actionSelectGroup = (state: DocStore) => state.selectGroup;
export const actionSelectEnvironment = (state: DocStore) =>
	state.selectEnvironment;
export const actionSelectEndpoint = (state: DocStore) => state.selectEndpoint;
export const actionSelectEntity = (state: DocStore) => state.selectEntity;
export const actionImportDoc = (state: DocStore) => state.importDoc;
export const actionLoadDoc = (state: DocStore) => state.loadDoc;
export const actionAddEnvironment = (state: DocStore) => state.addEnvironment;
export const actionUpdateEnvironment = (state: DocStore) =>
	state.updateEnvironment;
export const actionDeleteEnvironment = (state: DocStore) =>
	state.deleteEnvironment;
export const actionAddVariableToEnv = (state: DocStore) =>
	state.addVariableToEnv;
export const actionUpdateVariableInEnv = (state: DocStore) =>
	state.updateVariableInEnv;
export const actionDeleteVariableFromEnv = (state: DocStore) =>
	state.deleteVariableFromEnv;
export const actionUpdateEndpointParamValue = (state: DocStore) =>
	state.updateEndpointParamValue;
export const actionPatchEnvironmentAuth = (state: DocStore) =>
	state.patchEnvironmentAuth;
export const actionPatchEnvironmentAccessToken = (state: DocStore) =>
	state.patchEnvironmentAccessToken;
