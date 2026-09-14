import { log } from "./log";

/**
 * Глобальные ловушки: исключение вне React-дерева и отклонённый промис без
 * обработчика. Без них такие ошибки видны только в devtools, которых у
 * пользователя нет.
 */
export function installGlobalTraps(): void {
	window.addEventListener("error", (event) => {
		log.error(
			`необработанная ошибка в ${event.filename}:${event.lineno}`,
			event.error ?? event.message,
		);
	});

	window.addEventListener("unhandledrejection", (event) => {
		log.error("необработанный отказ промиса", event.reason);
	});
}
