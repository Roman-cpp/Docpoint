import type { DbKind } from "./db-source.entity";

/** Режим TLS. `prefer` — попробовать и отступить, если сервер не умеет. */
export type DbSslMode = "disable" | "prefer" | "require" | "verify-full";

/**
 * Реквизиты подключения к внешней базе.
 *
 * Уходят с каждым вызовом и нигде не сохраняются: у импорта нет ни списка
 * подключений, ни хранилища паролей. Набор нужных полей зависит от вида базы —
 * у SQLite это только `file`.
 */
export interface DbConnectionDTO {
	kind: DbKind;
	host?: string;
	port?: number;
	user?: string;
	password?: string;
	database?: string;
	schema?: string;
	file?: string;
	ssl?: DbSslMode;
}
