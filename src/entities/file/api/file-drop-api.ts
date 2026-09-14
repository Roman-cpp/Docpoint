import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { FileDropEvent } from "../model/file-drop.type";

/** Отписка от событий перетаскивания. */
export type UnsubscribeFileDrop = () => void;

/**
 * Файлы, которые тащат в окно из системы. Событие даёт пути — как и системный
 * диалог, бэкенд забирает файл копией по пути, а у `File` из веб-события пути
 * нет.
 *
 * Перетаскивание без файлов (свой узел внутри окна, текст) не передаётся: таким
 * приёмнику заниматься нечем.
 */
export function subscribeFileDropApi(
	handler: (event: FileDropEvent) => void,
): Promise<UnsubscribeFileDrop> {
	return getCurrentWebview().onDragDropEvent((event) => {
		const payload = event.payload;
		switch (payload.type) {
			case "enter":
				if (payload.paths.length > 0) {
					handler({ type: "enter", paths: payload.paths });
				}
				break;
			case "drop":
				if (payload.paths.length > 0) {
					handler({ type: "drop", paths: payload.paths });
				}
				break;
			case "leave":
				handler({ type: "leave" });
				break;
			default:
				break;
		}
	});
}
