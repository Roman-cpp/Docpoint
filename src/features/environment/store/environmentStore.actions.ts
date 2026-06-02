import type { EnvironmentStore } from "./useEnvironmentStore";

export const actionSelectEnvironment = (state: EnvironmentStore) =>
	state.selectEnvironment;
export const actionUpdateEnvironment = (state: EnvironmentStore) =>
	state.updateEnvironment;
export const actionaddVariableToEnvironment = (state: EnvironmentStore) =>
	state.addVariableToEnvironment;
export const actionupdateVariableInEnvironment = (state: EnvironmentStore) =>
	state.updateVariableInEnvironment;
export const actiondeleteVariableFromEnvironment = (state: EnvironmentStore) =>
	state.deleteVariableFromEnvironment;
export const actionUpdateEnvironmentToken = (state: EnvironmentStore) =>
	state.updateEnvironmentToken;
