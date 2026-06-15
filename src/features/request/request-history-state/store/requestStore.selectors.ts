import type { RequestStore } from "./useRequestStore";

export const selectRequestList = (state: RequestStore) => state.requestList;
export const selectPagination = (state: RequestStore) => state.pagination;
export const selectSelectedRequest = (state: RequestStore) =>
	state.selectedRequest;
export const selectLoadingRequestList = (state: RequestStore) =>
	state.loadingRequestList;
export const selectLoadingRequest = (state: RequestStore) =>
	state.loadingRequest;
export const selectSearch = (state: RequestStore) => state.search;
export const selectFilters = (state: RequestStore) => state.filters;
