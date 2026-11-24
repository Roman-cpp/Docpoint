import { invoke } from "@tauri-apps/api/core";

interface DeleteErdFrameParams {
	frameId: string;
}

/**
 * Удаляет область. Таблицы, которые в ней лежали, остаются на месте: членство
 * в области геометрическое, и уносить с собой ей нечего.
 */
export function deleteErdFrameApi({
	frameId,
}: DeleteErdFrameParams): Promise<void> {
	return invoke("delete_erd_frame", { frameId });
}
