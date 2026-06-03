import type { DocStore } from "./useDocStore";

export const actionSelectGroup = (state: DocStore) => state.selectGroup;
export const actionSelectEndpoint = (state: DocStore) => state.selectEndpoint;
export const actionSelectEntity = (state: DocStore) => state.selectEntity;
export const actionfetchDoc = (state: DocStore) => state.fetchDoc;
export const actionUpdateEndpointParamValue = (state: DocStore) =>
	state.updateEndpointParamValue;
export const actionResetDoc = (state: DocStore) => state.resetDoc;
export const actionAddEndpoint = (state: DocStore) => state.addEndpoint;
