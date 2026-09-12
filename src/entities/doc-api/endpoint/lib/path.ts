/**
 * Имена сегментов пути: `/posts/{postId}/comments/{commentId}` → `postId`,
 * `commentId`. Перечень сегментов задаёт сам путь — `pathParams` эндпоинта
 * только описывает их (тип, описание, обязательность).
 */
export function extractPathParams(path: string): string[] {
	return [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}
