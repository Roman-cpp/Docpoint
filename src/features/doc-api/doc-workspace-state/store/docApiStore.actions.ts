import type { DocApiStore } from "./useDocApiStore";

export const actionSelectGroup = (state: DocApiStore) => state.selectGroup;
export const actionSelectEndpoint = (state: DocApiStore) =>
	state.selectEndpoint;
export const actionfetchDocApi = (state: DocApiStore) => state.fetchDocApi;
export const actionUpdateEndpointParamValue = (state: DocApiStore) =>
	state.updateEndpointParamValue;
export const actionResetDocApi = (state: DocApiStore) => state.resetDocApi;
export const actionAddEndpoint = (state: DocApiStore) => state.addEndpoint;
export const actionUpdateEndpoint = (state: DocApiStore) =>
	state.updateEndpoint;
export const actionDeleteEndpoint = (state: DocApiStore) =>
	state.deleteEndpoint;
export const actionDeleteGroup = (state: DocApiStore) => state.deleteGroup;
