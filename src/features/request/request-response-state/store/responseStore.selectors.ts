import type { ResponseStore } from "./useResponseStore";

export const selectResponse = (state: ResponseStore) => state.response;
