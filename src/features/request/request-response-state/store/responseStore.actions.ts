import type { ResponseStore } from "./useResponseStore";

export const actionSetResponse = (state: ResponseStore) => state.setResponse;
export const actionClearResponse = (state: ResponseStore) =>
	state.clearResponse;
