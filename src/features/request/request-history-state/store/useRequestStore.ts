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

	setPage: (page: number) => void;
	setPerPage: (perPage: number) => void;
};

/** Default page size; mirrors the options offered in the table footer. */
const DEFAULT_PER_PAGE = 25;

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
	filters: { page: 1, perPage: DEFAULT_PER_PAGE },
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
		// A new query starts from the first page.
		set((state) => ({ search, filters: { ...state.filters, page: 1 } }));
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			get().fetchRequests();
		}, SEARCH_DEBOUNCE_MS);
	},

	// Changing a filter resets to page 1 so the user isn't left on an
	// out-of-range page. Callers refetch afterwards.
	setMethodFilter: (method) =>
		set((state) => ({ filters: { ...state.filters, method, page: 1 } })),
	setStatusFilter: (status) =>
		set((state) => ({ filters: { ...state.filters, status, page: 1 } })),
	resetFilters: () =>
		set((state) => ({
			filters: { page: 1, perPage: state.filters.perPage ?? DEFAULT_PER_PAGE },
		})),

	setPage: (page) => {
		set((state) => ({ filters: { ...state.filters, page } }));
		get().fetchRequests();
	},
	setPerPage: (perPage) => {
		// Resizing the page can move the current offset out of range, so go back
		// to the first page.
		set((state) => ({ filters: { ...state.filters, perPage, page: 1 } }));
		get().fetchRequests();
	},
});

export const useRequestStore = create<RequestStore>()(
	devtools(
		persist(createRequestSlice, {
			name: "RequestStore",
		}),
		{ name: "RequestStore" },
	),
);
