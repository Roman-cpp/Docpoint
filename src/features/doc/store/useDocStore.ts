import type { StateCreator } from "zustand";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { Doc } from "@/entities/doc";
import { readDocApi } from "@/entities/doc";
import type { Endpoint } from "@/entities/endpoint";
import { updateParamValueApi } from "@/entities/endpoint";
import type { Entity } from "@/entities/entity";
import { readEntitiesApi } from "@/entities/entity";
import type {
	Environment,
	UpdateEnvironmentDTO,
	Variable,
} from "@/entities/environment";
import {
	readEnvironmentsApi,
	updateEnvironmentTokenApi,
} from "@/entities/environment";
import type { Group } from "@/entities/group";
import { readGroupsApi } from "@/entities/group";

type DocState = {
	doc: Doc | null;
	groups: Group[] | null;
	entities: Entity[];
	environments: Environment[];

	selectedEnvironment: Environment | null;
	selectedGroup: Group | null;
	selectedEndpoint: Endpoint | null;
	selectedEntity: Entity | null;
};

type DocActions = {
	fetchDoc: (id: string) => Promise<void>;
	resetDoc: () => void;

	selectGroup: (groupId: string) => void;
	selectEnvironment: (envId: string) => void;
	selectEndpoint: (endpointId: string) => void;
	selectEntity: (entityId: string) => void;

	addEnvironment: (env: Environment) => void;
	updateEnvironment: (dto: UpdateEnvironmentDTO) => void;
	updateEnvironmentToken: (token: string | null) => Promise<void>;
	deleteEnvironment: (id: string) => void;

	addVariableToEnvironment: (environmentId: string, variable: Variable) => void;
	updateVariableInEnvironment: (variable: Variable) => void;
	deleteVariableFromEnvironment: (variableId: string) => void;

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
	environments: [],

	selectedGroup: null,
	selectedEnvironment: null,
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
	selectEnvironment: (envId: string) => {
		const { environments } = get();

		if (!environments) return;
		set({ selectedEnvironment: environments.find((env) => env.id === envId) });
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
	addEnvironment: (env) =>
		set((state) => ({
			environments: [...state.environments, env],
			selectedEnvironment: env,
		})),

	updateEnvironment: (dto) =>
		set((state) => {
			const updated = state.environments.map((env) =>
				env.id === dto.id
					? {
							...env,
							label: dto.label,
							baseUrl: dto.baseUrl,
							prefix: dto.prefix,
						}
					: env,
			);
			const updatedSelected =
				state.selectedEnvironment?.id === dto.id
					? {
							...state.selectedEnvironment,
							label: dto.label,
							baseUrl: dto.baseUrl,
							prefix: dto.prefix,
						}
					: state.selectedEnvironment;
			return { environments: updated, selectedEnvironment: updatedSelected };
		}),

	deleteEnvironment: (id) =>
		set((state) => ({
			environments: state.environments.filter((env) => env.id !== id),
			selectedEnvironment:
				state.selectedEnvironment?.id === id ? null : state.selectedEnvironment,
		})),

	addVariableToEnvironment: (environmentId, variable) =>
		set((state) => ({
			environments: state.environments.map((env) =>
				env.id === environmentId
					? { ...env, value: [...env.value, variable] }
					: env,
			),
			selectedEnvironment:
				state.selectedEnvironment?.id === environmentId
					? {
							...state.selectedEnvironment,
							value: [...state.selectedEnvironment.value, variable],
						}
					: state.selectedEnvironment,
		})),

	updateVariableInEnvironment: (variable) =>
		set((state) => ({
			environments: state.environments.map((env) => ({
				...env,
				value: env.value.map((v) => (v.id === variable.id ? variable : v)),
			})),
			selectedEnvironment: state.selectedEnvironment
				? {
						...state.selectedEnvironment,
						value: state.selectedEnvironment.value.map((v) =>
							v.id === variable.id ? variable : v,
						),
					}
				: null,
		})),

	deleteVariableFromEnvironment: (variableId) =>
		set((state) => ({
			environments: state.environments.map((env) => ({
				...env,
				value: env.value.filter((v) => v.id !== variableId),
			})),
			selectedEnvironment: state.selectedEnvironment
				? {
						...state.selectedEnvironment,
						value: state.selectedEnvironment.value.filter(
							(v) => v.id !== variableId,
						),
					}
				: null,
		})),
	updateEnvironmentToken: async (token) => {
		const { environments, selectedEnvironment } = get();

		if (!selectedEnvironment) return;
		await updateEnvironmentTokenApi(selectedEnvironment.id, token);

		set(() => {
			const apply = (e: Environment): Environment =>
				e.id === selectedEnvironment.id ? { ...e, accessToken: token } : e;
			return {
				environments: environments.map(apply),
				selectedEnvironment: selectedEnvironment
					? apply(selectedEnvironment)
					: selectedEnvironment,
			};
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
			const [doc, groups, entities, environments] = await Promise.all([
				readDocApi(id),
				readGroupsApi(id),
				readEntitiesApi(id),
				readEnvironmentsApi(id),
			]);
			set({ doc, groups, entities, environments });
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
				environments: state.environments,
			}),
		}),
		{ name: "DocStore" },
	),
);
