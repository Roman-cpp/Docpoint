import { invoke } from "@tauri-apps/api/core";
import type { CreateVariableDTO, Variable } from "../model/type";

export function createVariableApi(
	environmentId: string,
	variable: CreateVariableDTO,
): Promise<Variable> {
	return invoke("create_variable", { environmentId, variable });
}
