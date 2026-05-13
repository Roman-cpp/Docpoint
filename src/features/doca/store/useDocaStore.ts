import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Doca } from "@/entities/doca";
import type { EnvConfig } from "@/entities/env-config";
import type { Group } from "@/entities/group";
import type { Endpoint } from "@/entities/endpoint";
import type { Schema } from "@/entities/schema";
import {
	getDb,
	readAllDocaIds,
	readDoca,
	readGroups,
	readSchemas,
	readEnvConfigs,
	writeDoca,
	writeGroups,
	writeSchemas,
	writeEnvConfigs,
} from "@/shared/db";
import { seedDoca, seedGroups, seedSchema, seedEnvConfigs } from "@/features/doca/data";

type DocaState = {
	doca: Doca | null;
	groups: Group[] | null;
	schemas: Schema[];
	envConfigs: EnvConfig[];

	selectedEnvConfig: EnvConfig | null;
	selectedGroup: Group | null;
	selectedEndpoint: Endpoint | null;
  selectedSchema: Schema | null;

	accessToken: string | null;
};

type DocaActions = {
	selectGroup: (groupId: string) => void;
	selectEnvConfig: (envId: string) => void;
	selectEndpoint: (endpointId: string) => void;
  selectSchema: (schemaId: string) => void;
	setAccessToken: (token: string | null) => void;
	init: () => Promise<void>;
};

const initialState: DocaState = {
	doca: seedDoca,
	groups: seedGroups,
	schemas: seedSchema,
	envConfigs: seedEnvConfigs,

	selectedGroup: null,
	selectedEnvConfig: null,
	selectedEndpoint: null,
  selectedSchema: null,

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
  selectSchema: (schemaId: string) => {
    const { schemas } = get();

		if (!schemas) return;
		set({
			selectedSchema: schemas
				.find((endpoint) => endpoint.id === schemaId),
		});
  },

	setAccessToken: (token) => set({ accessToken: token }),

	init: async () => {
		try {
			const db = await getDb();
			const ids = await readAllDocaIds(db);

			if (ids.length === 0) {
				const { doca, groups, schemas, envConfigs } = get();
				if (!doca || !groups) return;
				await writeDoca(db, doca);
				await writeGroups(db, doca.id, groups);
				await writeSchemas(db, doca.id, schemas);
				await writeEnvConfigs(db, doca.id, envConfigs);
			} else {
				const docaId = ids[0];
				const [doca, groups, schemas, envConfigs] = await Promise.all([
					readDoca(db, docaId),
					readGroups(db, docaId),
					readSchemas(db, docaId),
					readEnvConfigs(db, docaId),
				]);
				set({ doca, groups, schemas, envConfigs });
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
