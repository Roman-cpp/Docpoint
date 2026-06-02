import type { StateCreator } from "zustand";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { Doc } from "@/entities/doc";
import { readDocApi } from "@/entities/doc";
import type { Endpoint } from "@/entities/endpoint";
import { updateParamValueApi } from "@/entities/endpoint";
import type { Entity } from "@/entities/entity";
import { readEntitiesApi } from "@/entities/entity";
import type { Group } from "@/entities/group";
import { readGroupsApi } from "@/entities/group";

type DocState = {
	doc: Doc | null;
	groups: Group[] | null;
	entities: Entity[];

	selectedGroup: Group | null;
	selectedEndpoint: Endpoint | null;
	selectedEntity: Entity | null;
};

type DocActions = {
	fetchDoc: (id: string) => Promise<void>;
	resetDoc: () => void;

	selectGroup: (groupId: string) => void;
	selectEndpoint: (endpointId: string) => void;
	selectEntity: (entityId: string) => void;

	updateEndpointParamValue: (
		endpointId: string,
		kind: "query" | "body",
		name: string,
		value: string,
	) => Promise<void>;
};

const initialState: DocState = {
	doc: null,
	groups: [],
	entities: [],

	selectedGroup: null,
	selectedEndpoint: null,
	selectedEntity: null,
};

export type DocStore = DocState & DocActions;

const createDocSlice: StateCreator<DocStore> = (set, get) => ({
	...initialState,

	resetDoc: () => set(initialState),

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
	selectEntity: (entityId: string) => {
		const { entities } = get();

		if (!entities) return;
		set({
			selectedEntity: entities.find((endpoint) => endpoint.id === entityId),
		});
	},
	updateEndpointParamValue: async (endpointId, kind, name, value) => {
		await updateParamValueApi(endpointId, kind, name, value);
		set((state) => {
			const patchEndpoint = (ep: Endpoint): Endpoint => {
				if (ep.id !== endpointId) return ep;
				const key = kind === "query" ? "queryParams" : "bodyParams";
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

	fetchDoc: async (id) => {
		try {
			const [doc, groups, entities] = await Promise.all([
				readDocApi(id),
				readGroupsApi(id),
				readEntitiesApi(id),
			]);
			set({ doc, groups, entities });
		} catch (e) {
			console.error("[DocStore] fetchDoc failed:", e);
			throw e;
		}
	},
});

export const useDocStore = create<DocStore>()(
	devtools(
		persist(createDocSlice, {
			name: "DocStore",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				doc: state.doc,
				groups: state.groups,
				entities: state.entities,
			}),
		}),
		{ name: "DocStore" },
	),
);
