import type { DocStore } from "./useDocStore";

export const selectDoc = (state: DocStore) => state.doc;
export const selectGroups = (state: DocStore) => state.groups;
export const selectSelectedGroup = (state: DocStore) => state.selectedGroup;
export const selectSelectedEntity = (state: DocStore) => state.selectedEntity;
export const selectSelectedEndpoint = (state: DocStore) =>
	state.selectedEndpoint;
export const selectEntities = (state: DocStore) => state.entities;
