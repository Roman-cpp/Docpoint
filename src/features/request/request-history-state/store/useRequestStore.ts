import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { HttpMethod } from "@/entities/endpoint";
import type { Request, RequestSummary } from "@/entities/request";
import {
	deleteAllRequestsApi,
	getRequestByIdApi,
	getRequestsApi,
} from "@/entities/request";
import type { Pagination } from "@/shared/model/http-response.type";
import { RequestFilters } from "@/entities/request/api/getRequestsApi";

type RequestState = {
	requestList: RequestSummary[];
	pagination: Pagination;
	selectedRequest: Request | null;

	loadingRequestList: boolean;
	loadingRequest: boolean;

	search: string;
	filters: RequestFilters;
};

type RequestActions = {
	fetchRequests: () => Promise<void>;
	resetRequests: () => void;

	selectRequest: (id: string) => Promise<void>;

	deleteAllRequests: () => Promise<void>;

	setSearch: (search: string) => void;

	setMethodFilter: (method: HttpMethod[]) => void;
	setStatusFilter: (status: string[]) => void;
	resetFilters: () => void;
};

const initialState: RequestState = {
	requestList: [],
	pagination: {
		page: 0,
		perPage: 0,
		total: 0,
		totalPages: 0,
	},
	selectedRequest: null,

	loadingRequest: false,
	loadingRequestList: false,

	search: "",
	filters: {},
};

export type RequestStore = RequestState & RequestActions;

/** Debounce timer for server-side search (see `setSearch`). */
let searchDebounce: ReturnType<typeof setTimeout> | undefined;
const SEARCH_DEBOUNCE_MS = 300;

const createRequestSlice: StateCreator<RequestStore> = (set, get) => ({
	...initialState,

	resetRequests: () => {
		set(initialState);
	},

	fetchRequests: async () => {
		set({ loadingRequestList: true });
		try {
			const { filters, search } = get();
			const res = await getRequestsApi({ ...filters, search });
			set({ requestList: res.data, pagination: res.pagination });
		} catch (e) {
			if ((e as Error).name !== "AbortError") {
				console.error("[RequestStore] fetchRequests failed:", e);
				throw e;
			}
		} finally {
			set({ loadingRequestList: false });
		}
	},

	selectRequest: async (id) => {
		set({ loadingRequest: true, selectedRequest: null });
		try {
			const res = await getRequestByIdApi(id);
			set({ selectedRequest: res.data });
		} catch (e) {
			console.error("[RequestStore] selectRequest failed:", e);
		} finally {
			set({ loadingRequest: false });
		}
	},

	deleteAllRequests: async () => {
		await deleteAllRequestsApi();
		set({ requestList: [] });
	},

	/**
	 * Update the search term and refetch with it as `?search=…`. Debounced so
	 * typing doesn't fire a request per keystroke.
	 */
	setSearch: (search) => {
		set({ search });
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			get().fetchRequests();
		}, SEARCH_DEBOUNCE_MS);
	},

	setMethodFilter: (method) =>
		set((state) => ({ filters: { ...state.filters, method } })),
	setStatusFilter: (status) =>
		set((state) => ({ filters: { ...state.filters, status } })),
	resetFilters: () => set({ filters: {} }),
});

export const useRequestStore = create<RequestStore>()(
	devtools(
		persist(createRequestSlice, {
			name: "RequestStore",
		}),
		{ name: "RequestStore" },
	),
);
