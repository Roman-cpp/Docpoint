import type { EnvironmentStore } from "./useEnvironmentStore";

export const selectEnvironment = (state: EnvironmentStore) => state.environment;
