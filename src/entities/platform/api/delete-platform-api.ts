import { invoke } from "@tauri-apps/api/core";

interface DeletePlatformParams {
	id: string;
}

export function deletePlatformApi({ id }: DeletePlatformParams): Promise<void> {
	return invoke("delete_platform", { id });
}
