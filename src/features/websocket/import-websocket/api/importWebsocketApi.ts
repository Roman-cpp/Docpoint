import { invoke } from "@tauri-apps/api/core";
import type { CreateNodeDTO } from "@/entities/catalog";

/** Сообщение в том виде, в каком его принимает команда импорта: id ещё нет —
 *  сообщение опознаётся по имени внутри своего сокета. */
export interface ImportWsMessageDTO {
	name: string;
	payload: string;
	desc: string;
}

/** Итог импорта: сокет выбрал сам файл, поэтому в отчёте есть и он. */
export interface ImportWebsocketReport {
	docId: string;
	docName: string;
	/** `true` — сокета с таким id не было, и он заведён этим импортом. */
	created: boolean;
	messagesAdded: number;
	messagesUpdated: number;
}

/**
 * Заводит или дописывает WebSocket-документ из файла.
 *
 * Одной командой, а не узлом плюс циклом создания сообщений: решение
 * «создать или дописать» принимается по id из файла, и принимать его должна
 * та сторона, которая видит дерево.
 */
export function importWebsocketApi(
	node: CreateNodeDTO,
	messages: ImportWsMessageDTO[],
): Promise<ImportWebsocketReport> {
	return invoke("import_websocket", { node, messages });
}
