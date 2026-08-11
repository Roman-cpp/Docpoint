/** Запрос, который бэкенд отправляет наружу по команде `send_request`. */
export interface SendRequestPayload {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string | null;
}

/** Ответ на отправленный запрос — как его возвращает `send_request`. */
export interface SendRequestResult {
	status: number;
	status_text: string;
	headers: Record<string, string>;
	/**
	 * Все `Set-Cookie` ответа, по одному на элемент: в `headers` одноимённые
	 * схлопываются в последний, поэтому бэкенд отдаёт их отдельным списком.
	 */
	set_cookies: string[];
	body: string;
	duration_ms: number;
}
