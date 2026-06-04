import type { StateCreator } from "zustand";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { readEnvironmentsByDocApi } from "@/entities/doc";
import type {
	Environment,
	UpdateEnvironmentDTO,
	Variable,
} from "@/entities/environment";
import {
	readEnvironmentsByPlatformApi,
	setSelectedEnvironmentApi,
	updateEnvironmentTokenApi,
} from "@/entities/environment";

type EnvironmentsState = {
	environments: Environment[];
	selectedEnvironment: Environment | null;
};

type EnvironmentsActions = {
	fetchEnvironmentsPlatform: (platformId: string) => Promise<void>;
	fetchEnvironmentsDoc: (docId: string) => Promise<void>;
	resetEnvironments: () => void;

	selectEnvironment: (environmentId: string) => void;

	addEnvironment: (env: Environment) => void;
	updateEnvironment: (dto: UpdateEnvironmentDTO) => void;
	updateEnvironmentToken: (token: string | null) => Promise<void>;
	deleteEnvironment: (id: string) => void;

	addVariableToEnvironment: (environmentId: string, variable: Variable) => void;
	updateVariableInEnvironment: (variable: Variable) => void;
	deleteVariableFromEnvironment: (variableId: string) => void;
};

const initialState: EnvironmentsState = {
	environments: [],
	selectedEnvironment: null,
};

export type EnvironmentsStore = EnvironmentsState & EnvironmentsActions;

const createEnvironmentSlice: StateCreator<EnvironmentsStore> = (set, get) => ({
	...initialState,

	fetchEnvironmentsPlatform: async (platformId: string) => {
		try {
			const environments = await readEnvironmentsByPlatformApi(platformId);
			set({ environments });
		} catch (e) {
			console.error("[DocStore] fetchDoc failed:", e);
			throw e;
		}
	},
	fetchEnvironmentsDoc: async (docId: string) => {
		try {
			const environments = await readEnvironmentsByDocApi(docId);
			set({ environments });
		} catch (e) {
			console.error("[DocStore] fetchDoc failed:", e);
			throw e;
		}
	},

	resetEnvironments: () => set(initialState),

	selectEnvironment: (environmentId: string) => {
		const { environments } = get();
		const selected = environments.find((env) => env.id === environmentId);
		set({ selectedEnvironment: selected });
		setSelectedEnvironmentApi(selected?.id ?? null).catch((e) =>
			console.error("[EnvironmentsStore] set_selected_environment failed:", e),
		);
	},

	addEnvironment: (environment: Environment) =>
		set((state) => ({
			environments: [...state.environments, environment],
			selectedEnvironment: environment,
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
	deleteEnvironment: (id) =>
		set((state) => ({
			environments: state.environments.filter((env) => env.id !== id),
			selectedEnvironment:
				state.selectedEnvironment?.id === id ? null : state.selectedEnvironment,
		})),
});

export const useEnvironmentsStore = create<EnvironmentsStore>()(
	devtools(
		persist(createEnvironmentSlice, {
			name: "EnvironmentsStore",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				environments: state.environments,
			}),
		}),
		{ name: "EnvironmentsStore" },
	),
);
