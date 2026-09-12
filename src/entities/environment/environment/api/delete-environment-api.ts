import { invoke } from "@tauri-apps/api/core";

interface DeleteEnvironmentParams {
	id: string;
}

export function deleteEnvironmentApi({
	id,
}: DeleteEnvironmentParams): Promise<void> {
	return invoke("delete_environment", { id });
}
