import type { StateCreator } from "zustand";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type {
	CreateEndpointDTO,
	Doc,
	Endpoint,
	Group,
	UpdateEndpointDTO,
} from "@/entities/doc-api";
import {
	createEndpointApi,
	deleteEndpointApi,
	deleteGroupApi,
	getDocApi,
	getGroupsApi,
	updateEndpointApi,
	updateParamValueApi,
} from "@/entities/doc-api";

type DocApiState = {
	doc: Doc | null;
	groups: Group[] | null;

	selectedGroup: Group | null;
	selectedEndpoint: Endpoint | null;
};

type DocApiActions = {
	fetchDocApi: (id: string) => Promise<void>;
	resetDocApi: () => void;

	selectGroup: (groupId: string) => void;
	selectEndpoint: (endpointId: string) => void;

	updateEndpointParamValue: (
		endpointId: string,
		kind: "path" | "query" | "body",
		name: string,
		value: string,
	) => Promise<void>;

	addEndpoint: (args: {
		groupId?: string;
		groupLabel?: string;
		endpoint: CreateEndpointDTO;
	}) => Promise<void>;

	updateEndpoint: (endpoint: UpdateEndpointDTO) => Promise<void>;

	deleteEndpoint: (endpointId: string) => Promise<void>;

	deleteGroup: (groupId: string) => Promise<void>;
};

const initialState: DocApiState = {
	doc: null,
	groups: [],

	selectedGroup: null,
	selectedEndpoint: null,
};

export type DocApiStore = DocApiState & DocApiActions;

const createDocApiSlice: StateCreator<DocApiStore> = (set, get) => ({
	...initialState,

	resetDocApi: () => set(initialState),

	selectGroup: (groupId: string) => {
		const { groups } = get();

		if (!groups) return;
		set({
			selectedGroup: groups.find((endpoint) => endpoint.id === groupId),
		});
	},
	selectEndpoint: (endpointId: string) => {
		const { groups } = get();

		if (!groups) return;
		set({
			selectedEndpoint: groups
				.flatMap((group) => group.endpoints)
				.find((endpoint) => endpoint.id === endpointId),
		});
	},
	updateEndpointParamValue: async (endpointId, kind, name, value) => {
		await updateParamValueApi(endpointId, kind, name, value);
		set((state) => {
			const patchEndpoint = (ep: Endpoint): Endpoint => {
				if (ep.id !== endpointId) return ep;
				const key = `${kind}Params` as const;
				return {
					...ep,
					[key]: ep[key].map((p) => (p.name === name ? { ...p, value } : p)),
				};
			};
			return {
				groups: state.groups
					? state.groups.map((g) => ({
							...g,
							endpoints: g.endpoints.map(patchEndpoint),
						}))
					: state.groups,
				selectedEndpoint: state.selectedEndpoint
					? patchEndpoint(state.selectedEndpoint)
					: state.selectedEndpoint,
			};
		});
	},

	addEndpoint: async ({ groupId, groupLabel, endpoint }) => {
		const docId = get().doc?.id;
		if (!docId) throw new Error("[DocApiStore] addEndpoint: no doc loaded");

		await createEndpointApi({ docId, groupId, groupLabel, endpoint });
		await get().fetchDocApi(docId);
	},

	updateEndpoint: async (endpoint) => {
		const docId = get().doc?.id;
		if (!docId) throw new Error("[DocApiStore] updateEndpoint: no doc loaded");

		await updateEndpointApi(endpoint);

		// Оптимистично обновляем выбранный endpoint, чтобы UI не моргал до refetch.
		set((state) => {
			const patchEndpoint = (ep: Endpoint): Endpoint =>
				ep.id === endpoint.id ? { ...ep, ...endpoint } : ep;

			return {
				groups: state.groups
					? state.groups.map((g) => ({
							...g,
							endpoints: g.endpoints.map(patchEndpoint),
						}))
					: state.groups,
				selectedEndpoint: state.selectedEndpoint
					? patchEndpoint(state.selectedEndpoint)
					: state.selectedEndpoint,
			};
		});

		await get().fetchDocApi(docId);
	},

	deleteEndpoint: async (endpointId) => {
		const docId = get().doc?.id;
		if (!docId) throw new Error("[DocApiStore] deleteEndpoint: no doc loaded");

		await deleteEndpointApi(endpointId);

		// Сбрасываем выбор, если удалили текущий endpoint.
		if (get().selectedEndpoint?.id === endpointId) {
			set({ selectedEndpoint: null });
		}

		await get().fetchDocApi(docId);
	},

	deleteGroup: async (groupId) => {
		const docId = get().doc?.id;
		if (!docId) throw new Error("[DocApiStore] deleteGroup: no doc loaded");

		await deleteGroupApi(groupId);

		// Сбрасываем выбор, если удалили текущую группу.
		if (get().selectedGroup?.id === groupId) {
			set({ selectedGroup: null });
		}

		await get().fetchDocApi(docId);
	},

	fetchDocApi: async (id) => {
		try {
			const [doc, groups] = await Promise.all([
				getDocApi(id),
				getGroupsApi(id),
			]);
			set({ doc, groups });
		} catch (e) {
			console.error("[DocApiStore] fetchDocApi failed:", e);
			throw e;
		}
	},
});

export const useDocApiStore = create<DocApiStore>()(
	devtools(
		persist(createDocApiSlice, {
			name: "DocApiStore",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				doc: state.doc,
				groups: state.groups,
			}),
		}),
		{ name: "DocApiStore" },
	),
);
