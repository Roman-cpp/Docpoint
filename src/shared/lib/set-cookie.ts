/**
 * Разбор заголовка `Set-Cookie`.
 *
 * Сервер шлёт по заголовку на куку, и в каждом — пара «имя=значение» плюс
 * атрибуты через точку с запятой. Значение само может содержать `=`
 * (base64, подписи), поэтому режем только по первому.
 */
export interface SetCookie {
	name: string;
	value: string;
	/** Атрибуты как их прислал сервер: `Path=/`, `HttpOnly`, `Max-Age=3600`. */
	attrs: string[];
}

export function parseSetCookie(raw: string): SetCookie | null {
	const [pair, ...rest] = raw.split(";");
	const at = pair.indexOf("=");
	if (at < 1) return null;

	return {
		name: pair.slice(0, at).trim(),
		value: pair.slice(at + 1).trim(),
		attrs: rest.map((attr) => attr.trim()).filter((attr) => attr !== ""),
	};
}

/**
 * Куки, которые сервер выставил этим ответом. Заголовков `Set-Cookie` бывает
 * несколько, поэтому на вход идёт список заголовков целиком.
 */
export function collectSetCookies(
	headers: { key: string; value: string }[] | undefined,
): SetCookie[] {
	return (headers ?? [])
		.filter((header) => header.key.toLowerCase() === "set-cookie")
		.map((header) => parseSetCookie(header.value))
		.filter((cookie): cookie is SetCookie => cookie !== null);
}
