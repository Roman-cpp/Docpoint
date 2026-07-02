import type { DocApiStore } from "./useDocApiStore";

export const selectDocApi = (state: DocApiStore) => state.doc;
export const selectGroups = (state: DocApiStore) => state.groups;
export const selectSelectedGroup = (state: DocApiStore) => state.selectedGroup;
export const selectSelectedEntity = (state: DocApiStore) =>
	state.selectedEntity;
export const selectSelectedEndpoint = (state: DocApiStore) =>
	state.selectedEndpoint;
export const selectEntities = (state: DocApiStore) => state.entities;
