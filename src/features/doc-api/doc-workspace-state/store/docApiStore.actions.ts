import type { DocApiStore } from "./useDocApiStore";

export const actionSelectGroup = (state: DocApiStore) => state.selectGroup;
export const actionSelectEndpoint = (state: DocApiStore) =>
	state.selectEndpoint;
export const actionSelectEntity = (state: DocApiStore) => state.selectEntity;
export const actionfetchDocApi = (state: DocApiStore) => state.fetchDocApi;
export const actionUpdateEndpointParamValue = (state: DocApiStore) =>
	state.updateEndpointParamValue;
export const actionResetDocApi = (state: DocApiStore) => state.resetDocApi;
export const actionAddEndpoint = (state: DocApiStore) => state.addEndpoint;
export const actionDeleteEndpoint = (state: DocApiStore) =>
	state.deleteEndpoint;
export const actionDeleteGroup = (state: DocApiStore) => state.deleteGroup;
export const actionUpdateEntity = (state: DocApiStore) => state.updateEntity;
export const actionAddEntity = (state: DocApiStore) => state.addEntity;
export const actionDeleteEntity = (state: DocApiStore) => state.deleteEntity;
