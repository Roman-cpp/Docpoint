import type { StateCreator } from "zustand";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type { CreateDocDTO, Doc } from "@/entities/doc";
import { importDoc, readDoc } from "@/entities/doc";
import type { Endpoint } from "@/entities/endpoint";
import { updateParamValue } from "@/entities/endpoint";
import type { CreateEntityDTO, Entity } from "@/entities/entity";
import { readEntities } from "@/entities/entity";
import type {
	CreateEnvironmentDTO,
	Environment,
	UpdateEnvironmentDTO,
	Variable,
} from "@/entities/environment";
import { readEnvironments } from "@/entities/environment";
import type { UpdateEnvironmentAuthDTO } from "@/entities/environment-auth";
import type { CreateGroupDTO, Group } from "@/entities/group";
import { readGroups } from "@/entities/group";

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
	addEnvironment: (env: Environment) => void;
	updateEnvironment: (dto: UpdateEnvironmentDTO) => void;
	deleteEnvironment: (id: string) => void;
	addVariableToEnv: (environmentId: string, variable: Variable) => void;
	updateVariableInEnv: (variable: Variable) => void;
	deleteVariableFromEnv: (variableId: string) => void;
	updateEndpointParamValue: (
		endpointId: string,
		kind: "query" | "body",
		name: string,
		value: string,
	) => Promise<void>;
	patchEnvironmentAuth: (dto: UpdateEnvironmentAuthDTO) => void;
	patchEnvironmentAccessToken: (id: string, token: string | null) => void;
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

	addVariableToEnv: (environmentId, variable) =>
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
						value: state.selectedEnvironment.value.filter(
							(v) => v.id !== variableId,
						),
					}
				: null,
		})),

	patchEnvironmentAuth: (dto) =>
		set((state) => {
			const apply = (e: Environment): Environment =>
				e.id === dto.environmentId
					? {
							...e,
							auth: {
								...e.auth,
								url: dto.url,
								method: dto.method,
								body: dto.body,
								tokenPath: dto.tokenPath,
							},
						}
					: e;
			return {
				environments: state.environments.map(apply),
				selectedEnvironment: state.selectedEnvironment
					? apply(state.selectedEnvironment)
					: state.selectedEnvironment,
			};
		}),

	patchEnvironmentAccessToken: (id, token) =>
		set((state) => {
			const apply = (e: Environment): Environment =>
				e.id === id ? { ...e, auth: { ...e.auth, accessToken: token } } : e;
			return {
				environments: state.environments.map(apply),
				selectedEnvironment: state.selectedEnvironment
					? apply(state.selectedEnvironment)
					: state.selectedEnvironment,
			};
		}),

	updateEndpointParamValue: async (endpointId, kind, name, value) => {
		await updateParamValue(endpointId, kind, name, value);
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

	importDoc: async ({ doc, groups, entities, environments }) => {
		try {
			const id = await importDoc({ doc, groups, entities, environments });
			const [savedGroups, savedEntities, savedEnvironments] = await Promise.all(
				[readGroups(id), readEntities(id), readEnvironments(id)],
			);
			set({
				doc: { ...doc, id },
				groups: savedGroups,
				entities: savedEntities,
				environments: savedEnvironments,
			});
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
