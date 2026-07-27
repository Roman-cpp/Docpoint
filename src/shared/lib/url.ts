/**
 * Склеивает части URL в одну строку: base URL, префиксы и путь.
 *
 * Пустые части отбрасываются, лишние и недостающие слэши на стыках
 * нормализуются, поэтому `joinUrl("https://api.io/", "/api/v1", "payments", "/users")`
 * и `joinUrl("https://api.io", "api/v1/", "/payments/", "users")` дают
 * одинаковый результат — `https://api.io/api/v1/payments/users`.
 *
 * Если ни одной непустой части нет, возвращает пустую строку.
 */
export function joinUrl(...parts: (string | null | undefined)[]): string {
	const [head, ...rest] = parts
		.map((part) => (part ?? "").trim())
		.filter((part) => part !== "" && part !== "/");

	if (!head) return "";

	return rest.reduce(
		(url, part) => `${url}/${part.replace(/^\/+|\/+$/g, "")}`,
		head.replace(/\/+$/, ""),
	);
}
