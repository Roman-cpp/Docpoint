import type { DocStore } from "./useDocStore";

export const actionSelectGroup = (state: DocStore) => state.selectGroup;
export const actionSelectEnvironment = (state: DocStore) =>
	state.selectEnvironment;
export const actionSelectEndpoint = (state: DocStore) => state.selectEndpoint;
export const actionSelectEntity = (state: DocStore) => state.selectEntity;
export const actionfetchDoc = (state: DocStore) => state.fetchDoc;
export const actionAddEnvironment = (state: DocStore) => state.addEnvironment;
export const actionUpdateEnvironment = (state: DocStore) =>
	state.updateEnvironment;
export const actionDeleteEnvironment = (state: DocStore) =>
	state.deleteEnvironment;
export const actionaddVariableToEnvironment = (state: DocStore) =>
	state.addVariableToEnvironment;
export const actionupdateVariableInEnvironment = (state: DocStore) =>
	state.updateVariableInEnvironment;
export const actiondeleteVariableFromEnvironment = (state: DocStore) =>
	state.deleteVariableFromEnvironment;
export const actionUpdateEndpointParamValue = (state: DocStore) =>
	state.updateEndpointParamValue;
export const actionUpdateEnvironmentToken = (state: DocStore) =>
	state.updateEnvironmentToken;
