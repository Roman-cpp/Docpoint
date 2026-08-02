/**
 * Что окружение прикладывает к запросу: токен в заголовке `Authorization` или
 * куки сессии, выданные сервером авторизации в `Set-Cookie`.
 */
export type TokenPlacement = "header" | "cookie";

/**
 * То же для WebSocket-рукопожатия. Отдельно от `TokenPlacement`: сервер,
 * читающий токен из HTTP-заголовка, часто не умеет читать его из заголовков
 * upgrade-запроса, поэтому есть ещё query-параметр.
 */
export type WsTokenPlacement = "query" | "header" | "cookie";

export interface EnvironmentAuth {
	id: string;
	environmentId: string;
	url: string;
	method: string;
	body: string;
	tokenPath: string;
	tokenPlacement: TokenPlacement;
	wsTokenPlacement: WsTokenPlacement;
	accessToken: string | null;
	/** Куки сессии окружения: имя → значение. Пишутся только авторизацией. */
	authCookies: Record<string, string>;
	/** Хост, выдавший куки; дальше него они не уходят. */
	authCookieHost: string;
}
