import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import type { Doc } from "@/entities/doc";
import type { Environment } from "@/entities/environment";
import type { Group } from "@/entities/group";
import type { Endpoint } from "@/entities/endpoint";
import type { Entity } from "@/entities/entity";
import { importDoc, readDoc } from "@/entities/doc";
import type { CreateDocDTO } from "@/entities/doc";
import { readGroups } from "@/entities/group";
import type { CreateGroupDTO } from "@/entities/group";
import { readEntities } from "@/entities/entity";
import type { CreateEntityDTO } from "@/entities/entity";
import { readEnvironments } from "@/entities/environment";
import type { CreateEnvironmentDTO, UpdateEnvironmentDTO, Variable } from "@/entities/environment";

type DocState = {
	doc: Doc | null;
	groups: Group[] | null;
	entities: Entity[];
	environments: Environment[];

	selectedEnvironment: Environment | null;
	selectedGroup: Group | null;
	selectedEndpoint: Endpoint | null;
  selectedEntity: Entity | null;

	accessToken: string | null;
};

type ImportDocPayload = {
	doc: CreateDocDTO;
	groups: CreateGroupDTO[];
	entities: CreateEntityDTO[];
	environments: CreateEnvironmentDTO[];
};

type DocActions = {
	selectGroup: (groupId: string) => void;
	selectEnvironment: (envId: string) => void;
	selectEndpoint: (endpointId: string) => void;
  selectEntity: (entityId: string) => void;
	setAccessToken: (token: string | null) => void;
	addEnvironment: (env: Environment) => void;
	updateEnvironment: (dto: UpdateEnvironmentDTO) => void;
	deleteEnvironment: (id: string) => void;
	addVariableToEnv: (environmentId: string, variable: Variable) => void;
	updateVariableInEnv: (variable: Variable) => void;
	deleteVariableFromEnv: (variableId: string) => void;
	importDoc: (payload: ImportDocPayload) => Promise<void>;
	loadDoc: (id: string) => Promise<void>;
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

	accessToken: null,
};

export type DocStore = DocState & DocActions;

const createDocSlice: StateCreator<DocStore> = (set, get) => ({
	...initialState,

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
			selectedEntity: entities
				.find((endpoint) => endpoint.id === entityId),
		});
  },

	setAccessToken: (token) => set({ accessToken: token }),

	addEnvironment: (env) =>
		set((state) => ({
			environments: [...state.environments, env],
			selectedEnvironment: env,
		})),

	updateEnvironment: (dto) =>
		set((state) => {
			const updated = state.environments.map((env) =>
				env.id === dto.id
					? { ...env, label: dto.label, baseUrl: dto.baseUrl, prefix: dto.prefix }
					: env,
			);
			const updatedSelected =
				state.selectedEnvironment?.id === dto.id
					? { ...state.selectedEnvironment, label: dto.label, baseUrl: dto.baseUrl, prefix: dto.prefix }
					: state.selectedEnvironment;
			return { environments: updated, selectedEnvironment: updatedSelected };
		}),

	deleteEnvironment: (id) =>
		set((state) => ({
			environments: state.environments.filter((env) => env.id !== id),
			selectedEnvironment:
				state.selectedEnvironment?.id === id ? null : state.selectedEnvironment,
		})),

	addVariableToEnv: (environmentId, variable) =>
		set((state) => ({
			environments: state.environments.map((env) =>
				env.id === environmentId
					? { ...env, value: [...env.value, variable] }
					: env,
			),
			selectedEnvironment:
				state.selectedEnvironment?.id === environmentId
					? { ...state.selectedEnvironment, value: [...state.selectedEnvironment.value, variable] }
					: state.selectedEnvironment,
		})),

	updateVariableInEnv: (variable) =>
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

	deleteVariableFromEnv: (variableId) =>
		set((state) => ({
			environments: state.environments.map((env) => ({
				...env,
				value: env.value.filter((v) => v.id !== variableId),
			})),
			selectedEnvironment: state.selectedEnvironment
				? {
						...state.selectedEnvironment,
						value: state.selectedEnvironment.value.filter((v) => v.id !== variableId),
					}
				: null,
		})),

	importDoc: async ({ doc, groups, entities, environments }) => {
		try {
			const id = await importDoc({ doc, groups, entities, environments });
			const [savedGroups, savedEntities, savedEnvironments] = await Promise.all([
				readGroups(id),
				readEntities(id),
				readEnvironments(id),
			]);
			set({ doc: { ...doc, id }, groups: savedGroups, entities: savedEntities, environments: savedEnvironments });
		} catch (e) {
			console.error("[DocStore] importDoc failed:", e);
			throw e;
		}
	},

	loadDoc: async (id) => {
		try {
			const [doc, groups, entities, environments] = await Promise.all([
				readDoc(id),
				readGroups(id),
				readEntities(id),
				readEnvironments(id),
			]);
			set({ doc, groups, entities, environments });
		} catch (e) {
			console.error("[DocStore] loadDoc failed:", e);
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
