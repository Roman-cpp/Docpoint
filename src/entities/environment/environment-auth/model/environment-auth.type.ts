/**
 * Верхний переключатель типа авторизации: `none` — ничего не подставлять,
 * `basic` — `Authorization: Basic` на каждый запрос и WS-рукопожатие,
 * `token` — заголовок/query/кука с токеном (см. {@link TokenSource}).
 */
export type AuthType = "none" | "basic" | "token";

/**
 * При `authType = "token"`: `static` — значение введено вручную (лежит в
 * `accessToken`), `login` — добывается запросом авторизации.
 */
export type TokenSource = "static" | "login";

/** Content-Type тела логин-запроса. */
export type BodyContentType = "json" | "form";

/**
 * Что окружение прикладывает к запросу: токен в заголовке `Authorization`,
 * токен в query-параметре или куки сессии, выданные сервером авторизации в
 * `Set-Cookie`.
 */
export type TokenPlacement = "header" | "cookie" | "query";

/**
 * То же для WebSocket-рукопожатия. Отдельно от `TokenPlacement`: сервер,
 * читающий токен из HTTP-заголовка, часто не умеет читать его из заголовков
 * upgrade-запроса, поэтому есть ещё query-параметр.
 */
export type WsTokenPlacement = "query" | "header" | "cookie";

export interface EnvironmentAuth {
	id: string;
	environmentId: string;
	authType: AuthType;
	basicUsername: string;
	basicPassword: string;
	tokenSource: TokenSource;
	/** Имя заголовка/query-параметра/куки для токена (по умолчанию `Authorization`). */
	credentialName: string;
	/** Префикс значения при `tokenPlacement === "header"` (`Bearer`, `Token`, пусто…). */
	scheme: string;
	url: string;
	method: string;
	body: string;
	bodyContentType: BodyContentType;
	/** Доп. статические заголовки логин-запроса. */
	extraHeaders: Record<string, string>;
	tokenPath: string;
	tokenPlacement: TokenPlacement;
	wsTokenPlacement: WsTokenPlacement;
	accessToken: string | null;
	/** Куки сессии окружения: имя → значение. Пишутся только авторизацией. */
	authCookies: Record<string, string>;
	/** Хост, выдавший куки; дальше него они не уходят. */
	authCookieHost: string;
}
