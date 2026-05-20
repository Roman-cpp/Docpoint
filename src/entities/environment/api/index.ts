import { invoke } from "@tauri-apps/api/core";
import type { CreateVariableDTO, Environment, UpdateEnvironmentDTO, UpdateVariableDTO, Variable } from "../model/type";

export function readEnvironments(docId: string): Promise<Environment[]> {
	return invoke("read_environments", { docId });
}

export function writeEnvironments(docId: string, environments: Environment[]): Promise<void> {
	return invoke("write_environments", { docId, environments });
}

export function updateEnvironment(environment: UpdateEnvironmentDTO): Promise<void> {
	return invoke("update_environment", { environment });
}

export function createVariable(environmentId: string, variable: CreateVariableDTO): Promise<Variable> {
	return invoke("create_variable", { environmentId, variable });
}

export function updateVariable(variable: UpdateVariableDTO): Promise<void> {
	return invoke("update_variable", { variable });
}

export function deleteVariable(id: string): Promise<void> {
	return invoke("delete_variable", { id });
}
