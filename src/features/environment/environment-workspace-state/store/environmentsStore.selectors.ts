import type { EnvironmentsStore } from "./useEnvironmentsStore";

export const selectEnvironments = (state: EnvironmentsStore) =>
	state.environments;
export const selectSelectedEnvironment = (state: EnvironmentsStore) =>
	state.selectedEnvironment;
export const selectEnvironmentToken = (state: EnvironmentsStore) =>
	state.selectedEnvironment?.accessToken;
