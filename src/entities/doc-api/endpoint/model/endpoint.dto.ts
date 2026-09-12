import type {
	BodyMode,
	RequestHeader,
} from "@/entities/doc-api/endpoint-request/@x/doc-api/endpoint";
import type { Endpoint } from "./endpoint.type";

/**
 * Набор «Try it» внутри файла импорта: части запроса лежат по своим полям —
 * `path` для сегментов пути (`/posts/{postId}`), `query` для строки запроса,
 * `headers` и `body`. Это не `EndpointRequest`: `id`, `endpointId` и `sortOrd`
 * бэкенд не читает (id генерируются заново, порядок берётся из позиции в
 * массиве), а значения параметров можно писать числом или булевым — в URL они
 * всё равно уезжают текстом.
 *
 * Формат целиком описан в `docs/import/doc-api/doc-api-import-format.md`.
 */
export interface ImportEndpointRequest {
	name: string;
	path?: Record<string, string | number | boolean>;
	query?: Record<string, string | number | boolean>;
	/** Объектом — все заголовки включены; массивом — когда нужен выключенный. */
	headers?: Record<string, string> | RequestHeader[];
	bodyMode?: BodyMode;
	/** Объект или массив уходит документом, строка — дословно. */
	body?: unknown;
	/** Прежняя форма записи `path` и `query`, читается ради старых файлов. */
	values?: { kind: string; name: string; value: string }[];
}

export type CreateEndpointDTO = Omit<Endpoint, "id"> & {
	/** Наборы «Try it», переносимые вместе с эндпоинтом при импорте файла. */
	requests?: ImportEndpointRequest[];
};
/** Правка переписывает эндпоинт целиком, включая параметры и ответы. */
export type UpdateEndpointDTO = Endpoint;
