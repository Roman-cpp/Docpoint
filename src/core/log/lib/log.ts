import * as plugin from "@tauri-apps/plugin-log";

type Level = "debug" | "info" | "warn" | "error";

const WRITERS: Record<Level, (message: string) => Promise<void>> = {
	debug: plugin.debug,
	info: plugin.info,
	warn: plugin.warn,
	error: plugin.error,
};

/** Ошибка в одну строку: сообщение и стек, если он есть. */
export const describeError = (error: unknown): string => {
	if (error instanceof Error) {
		return error.stack ? `${error.message}\n${error.stack}` : error.message;
	}
	if (typeof error === "string") return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

/**
 * Запись в общий файл логов приложения через `tauri-plugin-log`. Вне Tauri —
 * в браузере — плагина нет, тогда запись уходит в консоль:
 * логирование не должно само становиться причиной ошибки.
 */
const write = (level: Level, message: string) => {
	WRITERS[level](message).catch(() => {
		console[level](message);
	});
};

export const log = {
	debug: (message: string) => write("debug", message),
	info: (message: string) => write("info", message),
	warn: (message: string) => write("warn", message),
	error: (message: string, error?: unknown) =>
		write(
			"error",
			error === undefined ? message : `${message}: ${describeError(error)}`,
		),
};
