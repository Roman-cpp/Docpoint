import type { Endpoint } from "@/entities/doc-api";
import type { DocParam } from "./doc-param";

/**
 * Эндпоинт глазами документации: то, что модель хранит сегодня, плюс поля из
 * OpenAPI, которых ей ещё не хватает. Все они необязательные — страница
 * рисует каждое только когда оно пришло, поэтому блоки уже стоят на своих
 * местах, а заглушки рядом с ними уходят по одной, по мере появления данных.
 *
 * Список умышленно повторяет объект `Operation` из OpenAPI: так видно, чем
 * именно документ беднее спецификации.
 */
export interface DocEndpoint extends Endpoint {
	/** Стабильный идентификатор операции — ключ для кодогенерации. */
	operationId?: string;
	/** Метки операции; сейчас их роль играет единственная группа. */
	tags?: string[];
	/** Операция доживает последние версии. */
	deprecated?: boolean;
	/** Заголовки запроса как описываемые параметры (`in: header`). */
	headerParams?: DocParam[];
	/** Куки запроса (`in: cookie`). */
	cookieParams?: DocParam[];
	/** Форматы тела: `application/json`, `multipart/form-data`, … */
	bodyContentTypes?: string[];
	/** Схемы авторизации и скоупы вместо нынешнего булева `auth`. */
	security?: { scheme: string; scopes?: string[] }[];
}
