import { invoke } from "@tauri-apps/api/core";

/** Открыть системный диалог сохранения и выгрузить текст в выбранный файл —
 *  экспорт наружу, к дереву документов отношения не имеет. Резолвится в `true`,
 *  когда файл записан, и в `false`, когда пользователь отменил. */
export function exportMarkdownApi(
	content: string,
	filename: string,
): Promise<boolean> {
	return invoke("export_markdown", { content, filename });
}
