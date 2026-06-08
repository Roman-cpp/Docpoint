import type { RequestStore } from "./useRequestStore";

export const actionFetchRequests = (state: RequestStore) => state.fetchRequests;
export const actionResetRequests = (state: RequestStore) => state.resetRequests;
export const actionSelectRequest = (state: RequestStore) => state.selectRequest;
export const actionDeleteAllRequests = (state: RequestStore) =>
	state.deleteAllRequests;
export const actionSetSearch = (state: RequestStore) => state.setSearch;
