/** Файл импорта WebSocket-документа: сам сокет плюс его примеры сообщений. */
export interface ImportWebsocketPayload {
	version: number;
	websocket: {
		/** Id сокета. По нему импорт находит сокет, в который файл уже заливали,
		 *  и дописывает его вместо того, чтобы завести рядом второй. */
		id?: string;
		name: string;
		url: string;
	};
	messages: { name: string; desc?: string; payload: string }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown) =>
	typeof value === "string" ? value.trim() : "";

/**
 * Разбирает файл импорта и проверяет его форму.
 *
 * Файл пользователь пишет руками, поэтому каждая ошибка называет конкретное
 * поле — текст уходит прямо в тост. В отличие от импорта сообщений в открытый
 * сокет, здесь блок `websocket` обязателен: создавать нечего, если неизвестны
 * имя и адрес.
 */
export function parseWebsocketImport(raw: string): ImportWebsocketPayload {
	let json: unknown;
	try {
		json = JSON.parse(raw);
	} catch {
		throw new Error("Файл не является валидным JSON");
	}

	if (!isRecord(json))
		throw new Error(
			"Ожидался JSON-объект с полями version, websocket, messages",
		);

	if (json.version !== 1)
		throw new Error(
			`Неподдерживаемая версия формата: ${JSON.stringify(json.version)} (поддерживается 1)`,
		);

	const websocket = json.websocket;
	if (!isRecord(websocket))
		throw new Error(
			"Нет блока websocket — при импорте в каталог он обязателен: из него берутся имя и адрес сокета",
		);

	const id = text(websocket.id);
	const name = text(websocket.name);
	const url = text(websocket.url);
	if (!name) throw new Error("websocket.name пуст — сокету нужно имя");
	if (!url) throw new Error("websocket.url пуст — сокету нужен адрес");

	// Сообщения необязательны: сокет без примеров — тоже законный документ.
	const rawMessages = json.messages ?? [];
	if (!Array.isArray(rawMessages))
		throw new Error("messages должен быть массивом");

	const messages = rawMessages.map((item, index) => {
		if (!isRecord(item))
			throw new Error(`Сообщение №${index + 1}: ожидался объект`);

		const messageName = text(item.name);
		if (!messageName)
			throw new Error(`Сообщение №${index + 1}: пустое поле name`);

		if (typeof item.payload !== "string")
			throw new Error(
				`Сообщение «${messageName}»: payload должен быть строкой — JSON внутри экранируется`,
			);

		return { name: messageName, payload: item.payload, desc: text(item.desc) };
	});

	return {
		version: 1,
		websocket: id ? { id, name, url } : { name, url },
		messages,
	};
}
