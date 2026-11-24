import type { DbConnectionDTO, DbSslMode } from "../model/db-source.dto";
import type { DbKind } from "../model/db-source.type";

/** Черновик формы подключения: всё строками, как их вводят. */
export interface ConnectionDraft {
	kind: DbKind;
	host: string;
	port: string;
	user: string;
	password: string;
	database: string;
	file: string;
	ssl: DbSslMode;
}

/** Название вида базы для человека — им подписывают источник в документе. */
export const DB_KIND_LABEL: Record<DbKind, string> = {
	postgres: "PostgreSQL",
	mysql: "MySQL",
	sqlite: "SQLite",
};

/** Порт по умолчанию подставляется при смене вида базы. */
export const DEFAULT_PORT: Record<DbKind, string> = {
	postgres: "5432",
	mysql: "3306",
	sqlite: "",
};

export const emptyDraft = (kind: DbKind = "postgres"): ConnectionDraft => ({
	kind,
	host: "localhost",
	port: DEFAULT_PORT[kind],
	user: "",
	password: "",
	database: "",
	file: "",
	ssl: "prefer",
});

/** У SQLite нет ни хоста, ни учётных данных, ни схем — только файл. */
export const isFileBased = (kind: DbKind) => kind === "sqlite";

/** Чего не хватает для подключения; `null` — можно подключаться. */
export const draftProblem = (draft: ConnectionDraft): string | null => {
	if (isFileBased(draft.kind)) {
		return draft.file.trim() ? null : "Выберите файл базы SQLite.";
	}
	if (!draft.host.trim()) return "Укажите хост.";
	if (!/^\d+$/.test(draft.port.trim())) return "Порт — число.";
	if (!draft.user.trim()) return "Укажите пользователя.";
	if (!draft.database.trim()) return "Укажите базу данных.";
	return null;
};

export const toConnection = (draft: ConnectionDraft): DbConnectionDTO =>
	isFileBased(draft.kind)
		? { kind: draft.kind, file: draft.file.trim() }
		: {
				kind: draft.kind,
				host: draft.host.trim(),
				port: Number(draft.port),
				user: draft.user.trim(),
				password: draft.password,
				database: draft.database.trim(),
				ssl: draft.ssl,
			};
