import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Doca } from "@/entities/doca";
import type { EnvConfig } from "@/entities/env-config";
import type { Group } from "@/entities/group";
import type { Endpoint } from "@/entities/endpoint";
import type { Entity } from "@/entities/entity";
import {
	readAllDocs,
	readGroups,
	readSchemas,
	readEnvConfigs,
	writeDoca,
	writeGroups,
	writeSchemas,
	writeEnvConfigs,
	deleteDoca,
} from "@/shared/db";
import { seedDoca, seedGroups, seedSchema, seedEnvConfigs } from "@/features/doca/data";

type DocaState = {
  docs: Doca[];
	doca: Doca | null;
	groups: Group[] | null;
	entities: Entity[];
	envConfigs: EnvConfig[];

	selectedEnvConfig: EnvConfig | null;
	selectedGroup: Group | null;
	selectedEndpoint: Endpoint | null;
  selectedEntity: Entity | null;

	accessToken: string | null;
};

type ImportDocaPayload = {
	doca: Doca;
	groups: Group[];
	entities: Entity[];
	envConfigs: EnvConfig[];
};

type DocaActions = {
	selectGroup: (groupId: string) => void;
	selectEnvConfig: (envId: string) => void;
	selectEndpoint: (endpointId: string) => void;
  selectEntity: (entityId: string) => void;
	setAccessToken: (token: string | null) => void;
	init: () => Promise<void>;
	importDoca: (payload: ImportDocaPayload) => Promise<void>;
	deleteDoca: (id: string) => Promise<void>;
};

const initialState: DocaState = {
  docs: [],
	doca: seedDoca,
	groups: seedGroups,
	entities: seedSchema,
	envConfigs: seedEnvConfigs,

	selectedGroup: null,
	selectedEnvConfig: null,
	selectedEndpoint: null,
  selectedEntity: null,

	accessToken: null,
};

export type DocaStore = DocaState & DocaActions;

const createDocaSlice: StateCreator<DocaStore> = (set, get) => ({
	...initialState,

	selectGroup: (groupId: string) => {
		const { groups } = get();

		if (!groups) return;
		set({
			selectedGroup: groups.find((endpoint) => endpoint.id === groupId),
		});
	},
	selectEnvConfig: (envId: string) => {
		const { envConfigs } = get();

		if (!envConfigs) return;
		set({ selectedEnvConfig: envConfigs.find((env) => env.id === envId) });
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

	deleteDoca: async (id: string) => {
		try {
			await deleteDoca(id);
			const docs = await readAllDocs();
			const next = docs[0] ?? null;
			if (next) {
				const [groups, entities, envConfigs] = await Promise.all([
					readGroups(next.id),
					readSchemas(next.id),
					readEnvConfigs(next.id),
				]);
				set({ docs, doca: next, groups, entities, envConfigs, selectedEndpoint: null, selectedGroup: null, selectedEntity: null });
			} else {
				set({ docs: [], doca: null, groups: null, entities: [], envConfigs: [], selectedEndpoint: null, selectedGroup: null, selectedEntity: null });
			}
		} catch (e) {
			console.error("[DocaStore] deleteDoca failed:", e);
			throw e;
		}
	},

	importDoca: async ({ doca, groups, entities, envConfigs }) => {
		try {
			await writeDoca(doca);
			await writeGroups(doca.id, groups);
			await writeSchemas(doca.id, entities);
			await writeEnvConfigs(doca.id, envConfigs);
			const docs = await readAllDocs();
			set({ docs, doca, groups, entities, envConfigs });
		} catch (e) {
			console.error("[DocaStore] importDoca failed:", e);
			throw e;
		}
	},

	init: async () => {
		try {
			const docs = await readAllDocs();

			if (docs.length === 0) {
				const { doca, groups, entities, envConfigs } = get();
				if (!doca || !groups) return;
				await writeDoca(doca);
				await writeGroups(doca.id, groups);
				await writeSchemas(doca.id, entities);
				await writeEnvConfigs(doca.id, envConfigs);
				set({ docs: [doca] });
			} else {
				const docaId = docs[0].id;
				const [groups, entities, envConfigs] = await Promise.all([
					readGroups(docaId),
					readSchemas(docaId),
					readEnvConfigs(docaId),
				]);
				set({ docs, doca: docs[0], groups, entities, envConfigs });
			}
		} catch (e) {
			console.error("[DocaStore] init failed:", e);
		}
	},
});

export const useDocaStore = create<DocaStore>()(
	devtools(createDocaSlice, {
		name: "DocaStore",
	}),
);
