import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Doc } from "@/entities/doc";
import type { Environment } from "@/entities/environment";
import type { Group } from "@/entities/group";
import type { Endpoint } from "@/entities/endpoint";
import type { Entity } from "@/entities/entity";
import { readAllDocs, writeDoc, deleteDoc, importDoc } from "@/entities/doc";
import type { CreateDocDTO } from "@/entities/doc";
import { readGroups, writeGroups } from "@/entities/group";
import type { CreateGroupDTO } from "@/entities/group";
import { readEntities, writeEntities } from "@/entities/entity";
import type { CreateEntityDTO } from "@/entities/entity";
import { readEnvironments, writeEnvironments } from "@/entities/environment";
import type { CreateEnvironmentDTO, UpdateEnvironmentDTO, Variable } from "@/entities/environment";

type DocState = {
  docs: Doc[];
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
	updateEnvironment: (dto: UpdateEnvironmentDTO) => void;
	addVariableToEnv: (environmentId: string, variable: Variable) => void;
	updateVariableInEnv: (variable: Variable) => void;
	deleteVariableFromEnv: (variableId: string) => void;
	init: () => Promise<void>;
	importDoc: (payload: ImportDocPayload) => Promise<void>;
	deleteDoc: (id: string) => Promise<void>;
};

const initialState: DocState = {
  docs: [],
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

	deleteDoc: async (id: string) => {
		try {
			await deleteDoc(id);
			const docs = await readAllDocs();
			const next = docs[0] ?? null;
			if (next) {
				const [groups, entities, environments] = await Promise.all([
					readGroups(next.id),
					readEntities(next.id),
					readEnvironments(next.id),
				]);
				set({ docs, doc: next, groups, entities, environments, selectedEndpoint: null, selectedGroup: null, selectedEntity: null });
			} else {
				set({ docs: [], doc: null, groups: null, entities: [], environments: [], selectedEndpoint: null, selectedGroup: null, selectedEntity: null });
			}
		} catch (e) {
			console.error("[DocStore] deleteDoc failed:", e);
			throw e;
		}
	},

	importDoc: async ({ doc, groups, entities, environments }) => {
		try {
			const id = await importDoc({ doc, groups, entities, environments });
			const [docs, savedGroups, savedEntities, savedEnvironments] = await Promise.all([
				readAllDocs(),
				readGroups(id),
				readEntities(id),
				readEnvironments(id),
			]);
			set({ docs, doc: { ...doc, id }, groups: savedGroups, entities: savedEntities, environments: savedEnvironments });
		} catch (e) {
			console.error("[DocStore] importDoc failed:", e);
			throw e;
		}
	},

	init: async () => {
		try {
			const docs = await readAllDocs();

			if (docs.length === 0) {
				const { doc, groups, entities, environments } = get();
				if (!doc || !groups) return;
				const id = await writeDoc(doc);
				await writeGroups(id, groups);
				await writeEntities(id, entities);
				await writeEnvironments(id, environments);
				set({ docs: [{ ...doc, id }] });
			} else {
				const docId = docs[0].id;
				const [groups, entities, environments] = await Promise.all([
					readGroups(docId),
					readEntities(docId),
					readEnvironments(docId),
				]);
				set({ docs, doc: docs[0], groups, entities, environments });
			}
		} catch (e) {
			console.error("[DocStore] init failed:", e);
		}
	},
});

export const useDocStore = create<DocStore>()(
	devtools(createDocSlice, {
		name: "DocStore",
	}),
);
