import { invoke } from "@tauri-apps/api/core";
import type { CreateVariableDTO } from "../model/environment.dto";
import type { Variable } from "../model/environment.entity";

export function createVariableApi(
	environmentId: string,
	variable: CreateVariableDTO,
): Promise<Variable> {
	return invoke("create_variable", { environmentId, variable });
}
