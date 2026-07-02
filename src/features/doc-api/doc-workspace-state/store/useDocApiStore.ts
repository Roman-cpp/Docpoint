import type { StateCreator } from "zustand";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { Doc } from "@/entities/doc-api";
import { readDocApi } from "@/entities/doc-api";
import type { CreateEndpointDTO, Endpoint } from "@/entities/endpoint";
import {
	createEndpointApi,
	deleteEndpointApi,
	updateParamValueApi,
} from "@/entities/endpoint";
import type {
	CreateEntityDTO,
	Entity,
	UpdateEntityDTO,
} from "@/entities/entity";
import {
	createEntityApi,
	deleteEntityApi,
	readEntitiesApi,
	updateEntityApi,
} from "@/entities/entity";
import type { Group } from "@/entities/group";
import { deleteGroupApi, readGroupsApi } from "@/entities/group";

type DocApiState = {
	doc: Doc | null;
	groups: Group[] | null;
	entities: Entity[];

	selectedGroup: Group | null;
	selectedEndpoint: Endpoint | null;
	selectedEntity: Entity | null;
};

type DocApiActions = {
	fetchDocApi: (id: string) => Promise<void>;
	resetDocApi: () => void;

	selectGroup: (groupId: string) => void;
	selectEndpoint: (endpointId: string) => void;
	selectEntity: (entityId: string) => void;

	updateEndpointParamValue: (
		endpointId: string,
		kind: "query" | "body",
		name: string,
		value: string,
	) => Promise<void>;

	addEndpoint: (args: {
		groupId?: string;
		groupLabel?: string;
		endpoint: CreateEndpointDTO;
	}) => Promise<void>;

	deleteEndpoint: (endpointId: string) => Promise<void>;

	deleteGroup: (groupId: string) => Promise<void>;

	updateEntity: (entity: UpdateEntityDTO) => Promise<void>;
	addEntity: (schema: CreateEntityDTO) => Promise<string>;
	deleteEntity: (entityId: string) => Promise<void>;
};

const initialState: DocApiState = {
	doc: null,
	groups: [],
	entities: [],

	selectedGroup: null,
	selectedEndpoint: null,
	selectedEntity: null,
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

	addEndpoint: async ({ groupId, groupLabel, endpoint }) => {
		const docId = get().doc?.id;
		if (!docId) throw new Error("[DocApiStore] addEndpoint: no doc loaded");

		await createEndpointApi({ docId, groupId, groupLabel, endpoint });
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

	updateEntity: async (entity) => {
		const docId = get().doc?.id;
		if (!docId) throw new Error("[DocApiStore] updateEntity: no doc loaded");

		await updateEntityApi(entity);

		// Оптимистично обновляем выбранную entity, чтобы UI не моргал до refetch.
		set((state) => ({
			entities: state.entities.map((e) => (e.id === entity.id ? entity : e)),
			selectedEntity:
				state.selectedEntity?.id === entity.id ? entity : state.selectedEntity,
		}));

		await get().fetchDocApi(docId);
	},

	addEntity: async (schema) => {
		const docId = get().doc?.id;
		if (!docId) throw new Error("[DocApiStore] addEntity: no doc loaded");

		const newId = await createEntityApi(docId, schema);
		await get().fetchDocApi(docId);

		// Сразу выделяем созданную entity.
		get().selectEntity(newId);

		return newId;
	},

	deleteEntity: async (entityId) => {
		const docId = get().doc?.id;
		if (!docId) throw new Error("[DocApiStore] deleteEntity: no doc loaded");

		await deleteEntityApi(entityId);

		// Сбрасываем выбор, если удалили текущую entity.
		if (get().selectedEntity?.id === entityId) {
			set({ selectedEntity: null });
		}

		await get().fetchDocApi(docId);
	},

	fetchDocApi: async (id) => {
		try {
			const [doc, groups, entities] = await Promise.all([
				readDocApi(id),
				readGroupsApi(id),
				readEntitiesApi(id),
			]);
			set({ doc, groups, entities });
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
				entities: state.entities,
			}),
		}),
		{ name: "DocApiStore" },
	),
);
