import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { Request, RequestSummary } from "@/entities/request";
import {
	deleteAllRequestsApi,
	getRequestByIdApi,
	getRequestsApi,
} from "@/entities/request";
import type { Pagination } from "@/shared/model/http-response.type";

type RequestState = {
	requestList: RequestSummary[];
	pagination: Pagination;
	selectedRequest: Request | null;

	loadingRequestList: boolean;
	loadingRequest: boolean;

	search: string;
};

type RequestActions = {
	fetchRequests: () => Promise<void>;
	resetRequests: () => void;

	selectRequest: (id: string) => Promise<void>;

	deleteAllRequests: () => Promise<void>;

	setSearch: (search: string) => void;
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
};

export type RequestStore = RequestState & RequestActions;

const createRequestSlice: StateCreator<RequestStore> = (set) => ({
	...initialState,

	resetRequests: () => {
		set(initialState);
	},

	fetchRequests: async () => {
		set({ loadingRequestList: true });
		try {
			const res = await getRequestsApi();
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

	setSearch: (search) => set({ search }),
});

export const useRequestStore = create<RequestStore>()(
	devtools(
		persist(createRequestSlice, {
			name: "RequestStore",
		}),
		{ name: "RequestStore" },
	),
);
