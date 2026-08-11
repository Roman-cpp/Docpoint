import type { StateCreator } from "zustand";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type {
	Environment,
	UpdateEnvironmentDTO,
	Variable,
} from "@/entities/environment";
import {
	getEnvironmentsByDocApi,
	getEnvironmentsByPlatformApi,
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

/**
 * Отдаёт выбор бэкенду: он держит `selected_environment_id` в памяти процесса и
 * по нему подставляет авторизацию окружения в исходящие запросы. Обязателен
 * везде, где выбор меняется, — иначе бэкенд остаётся на прошлом окружении.
 */
function pushSelection(environmentId: string | null) {
	setSelectedEnvironmentApi(environmentId).catch((e) =>
		console.error("[EnvironmentsStore] set_selected_environment failed:", e),
	);
}

/**
 * Что считать выбранным при новом списке: держимся за текущее окружение, пока
 * оно в списке есть, иначе берём первое. Пока окружения существуют, одно из них
 * выбрано всегда — на него завязаны хедер, Try it и подстановка переменных.
 */
function reconcileSelection(
	environments: Environment[],
	current: Environment | null | undefined,
): Environment | null {
	const kept = current
		? environments.find((env) => env.id === current.id)
		: undefined;
	return kept ?? environments[0] ?? null;
}

const createEnvironmentSlice: StateCreator<EnvironmentsStore> = (set, get) => ({
	...initialState,

	fetchEnvironmentsPlatform: async (platformId: string) => {
		try {
			const environments = await getEnvironmentsByPlatformApi(platformId);
			const selectedEnvironment = reconcileSelection(
				environments,
				get().selectedEnvironment,
			);
			set({ environments, selectedEnvironment });
			pushSelection(selectedEnvironment?.id ?? null);
		} catch (e) {
			console.error("[DocStore] fetchDoc failed:", e);
			throw e;
		}
	},
	fetchEnvironmentsDoc: async (docId: string) => {
		try {
			const environments = await getEnvironmentsByDocApi(docId);
			const selectedEnvironment = reconcileSelection(
				environments,
				get().selectedEnvironment,
			);
			set({ environments, selectedEnvironment });
			pushSelection(selectedEnvironment?.id ?? null);
		} catch (e) {
			console.error("[DocStore] fetchDoc failed:", e);
			throw e;
		}
	},

	resetEnvironments: () => {
		set(initialState);
		pushSelection(null);
	},

	selectEnvironment: (environmentId: string) => {
		const { environments } = get();
		const selected =
			environments.find((env) => env.id === environmentId) ?? null;
		set({ selectedEnvironment: selected });
		pushSelection(selected?.id ?? null);
	},

	addEnvironment: (environment: Environment) => {
		set((state) => ({
			environments: [...state.environments, environment],
			selectedEnvironment: environment,
		}));
		pushSelection(environment.id);
	},

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
	deleteEnvironment: (id) => {
		const environments = get().environments.filter((env) => env.id !== id);
		const selectedEnvironment = reconcileSelection(
			environments,
			get().selectedEnvironment,
		);
		set({ environments, selectedEnvironment });
		pushSelection(selectedEnvironment?.id ?? null);
	},
});

export const useEnvironmentsStore = create<EnvironmentsStore>()(
	devtools(
		persist(createEnvironmentSlice, {
			name: "EnvironmentsStore",
			storage: createJSONStorage(() => localStorage),
			// Выбранное окружение переживает перезагрузку вместе со списком: без
			// него страница окружений и хедер открывались бы «ничего не выбрано»
			// в каждом новом окне, хотя окружение было прикреплено.
			partialize: (state) => ({
				environments: state.environments,
				selectedEnvironment: state.selectedEnvironment,
			}),
			// Сохранённый выбор мог устареть (окружение удалили в другом окне),
			// поэтому сверяем его со списком, а не берём вслепую.
			merge: (persisted, current) => {
				const state = { ...current, ...(persisted as EnvironmentsState) };
				state.selectedEnvironment = reconcileSelection(
					state.environments,
					state.selectedEnvironment,
				);
				return state;
			},
			// Бэкенд про восстановленный выбор ничего не знает: его
			// `selected_environment_id` живёт в памяти процесса и после
			// перезапуска пуст — возвращаем его в строй.
			onRehydrateStorage: () => (state) =>
				pushSelection(state?.selectedEnvironment?.id ?? null),
		}),
		{ name: "EnvironmentsStore" },
	),
);
