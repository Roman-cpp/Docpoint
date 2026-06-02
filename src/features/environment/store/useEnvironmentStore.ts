import type { StateCreator } from "zustand";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
	Environment,
	UpdateEnvironmentDTO,
	Variable,
} from "@/entities/environment";
import { updateEnvironmentTokenApi } from "@/entities/environment";

type EnvironmentState = {
	environment: Environment | null;
};

type EnvironmentActions = {
	resetEnvironment: () => void;

	selectEnvironment: (environment: Environment) => void;

	updateEnvironment: (dto: UpdateEnvironmentDTO) => void;
	updateEnvironmentToken: (token: string | null) => Promise<void>;

	addVariableToEnvironment: (environmentId: string, variable: Variable) => void;
	updateVariableInEnvironment: (variable: Variable) => void;
	deleteVariableFromEnvironment: (variableId: string) => void;
};

const initialState: EnvironmentState = {
	environment: null,
};

export type EnvironmentStore = EnvironmentState & EnvironmentActions;

const createEnvironmentSlice: StateCreator<EnvironmentStore> = (set, get) => ({
	...initialState,

	resetEnvironment: () => set(initialState),

	selectEnvironment: (environment: Environment) => {
		set({ environment: environment });
	},

	updateEnvironment: (dto) =>
		set((state) => {
			const updatedSelected =
				state.environment?.id === dto.id
					? {
							...state.environment,
							label: dto.label,
							baseUrl: dto.baseUrl,
							prefix: dto.prefix,
						}
					: state.environment;
			return { environment: updatedSelected };
		}),

	addVariableToEnvironment: (environmentId, variable) =>
		set((state) => ({
			environment:
				state.environment?.id === environmentId
					? {
							...state.environment,
							value: [...state.environment.value, variable],
						}
					: state.environment,
		})),

	updateVariableInEnvironment: (variable) =>
		set((state) => ({
			environment: state.environment
				? {
						...state.environment,
						value: state.environment.value.map((v) =>
							v.id === variable.id ? variable : v,
						),
					}
				: null,
		})),

	deleteVariableFromEnvironment: (variableId) =>
		set((state) => ({
			environment: state.environment
				? {
						...state.environment,
						value: state.environment.value.filter((v) => v.id !== variableId),
					}
				: null,
		})),
	updateEnvironmentToken: async (token) => {
		const { environment } = get();

		if (!environment) return;
		await updateEnvironmentTokenApi(environment.id, token);

		set(() => {
			const apply = (e: Environment): Environment =>
				e.id === environment.id ? { ...e, accessToken: token } : e;
			return {
				environment: environment ? apply(environment) : environment,
			};
		});
	},
});

export const useEnvironmentStore = create<EnvironmentStore>()(
	devtools(
		persist(createEnvironmentSlice, {
			name: "EnvironmentStore",
		}),
		{ name: "EnvironmentStore" },
	),
);
