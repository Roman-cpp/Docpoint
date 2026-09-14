import { invoke } from "@tauri-apps/api/core";
import type { CreateVariableDTO } from "../model/environment.dto";
import type { Variable } from "../model/environment.type";

interface CreateVariableParams {
	environmentId: string;
	variable: CreateVariableDTO;
}

export function createVariableApi({
	environmentId,
	variable,
}: CreateVariableParams): Promise<Variable> {
	return invoke("create_variable", { environmentId, variable });
}
