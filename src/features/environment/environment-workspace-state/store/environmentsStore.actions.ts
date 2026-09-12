import type { EnvironmentsStore } from "./useEnvironmentsStore";

export const actionFetchEnvironmentsPlatform = (state: EnvironmentsStore) =>
	state.fetchEnvironmentsPlatform;
export const actionSelectEnvironment = (state: EnvironmentsStore) =>
	state.selectEnvironment;
export const actionUpdateEnvironment = (state: EnvironmentsStore) =>
	state.updateEnvironment;
export const actionaddVariableToEnvironment = (state: EnvironmentsStore) =>
	state.addVariableToEnvironment;
export const actionupdateVariableInEnvironment = (state: EnvironmentsStore) =>
	state.updateVariableInEnvironment;
export const actiondeleteVariableFromEnvironment = (state: EnvironmentsStore) =>
	state.deleteVariableFromEnvironment;
export const actionUpdateEnvironmentToken = (state: EnvironmentsStore) =>
	state.updateEnvironmentToken;
export const actionAddEnvironment = (state: EnvironmentsStore) =>
	state.addEnvironment;
export const actionDeleteEnvironment = (state: EnvironmentsStore) =>
	state.deleteEnvironment;
