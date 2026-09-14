import { invoke } from "@tauri-apps/api/core";

/** Экспортирует платформу целиком — дерево документов, окружения и файлы —
 *  одним zip-архивом через системный диалог сохранения. */
export async function exportPlatform(platformId: string): Promise<void> {
	await invoke("export_platform", { platformId });
}
