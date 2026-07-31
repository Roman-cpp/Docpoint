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
	body: string;
	duration_ms: number;
}
