import type { DocApiStore } from "./useDocApiStore";

export const selectDocApi = (state: DocApiStore) => state.doc;
export const selectGroups = (state: DocApiStore) => state.groups;
export const selectSelectedEndpoint = (state: DocApiStore) =>
	state.selectedEndpoint;
