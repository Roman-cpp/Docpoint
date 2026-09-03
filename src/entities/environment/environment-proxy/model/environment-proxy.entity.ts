/**
 * Прокси окружения: через него уходят все HTTP-запросы, отправленные при
 * выбранном окружении, — и запросы пользователя, и запрос авторизации.
 * WebSocket-рукопожатие идёт напрямую.
 */
export interface EnvironmentProxy {
	id: string;
	environmentId: string;
	enabled: boolean;
	/** `http://host:port`, `https://…` или `socks5://…`; без схемы — http. */
	url: string;
	username: string;
	password: string;
	/** Хосты в обход прокси, через запятую. */
	bypass: string;
	/** Не проверять TLS-сертификат: отладочные прокси подменяют его своим. */
	insecure: boolean;
}
