import { type FC, useMemo, useState } from "react";
import { cx } from "@/shared/lib/cx";
import { CloseIcon, DownloadIcon, SearchIcon } from "@/shared/svg";
import { Header } from "@/widgets/header";
import { Sidebar } from "@/widgets/sidebar";
import s from "./LogsPage.module.css";

/* ─── Types (template-local; no API yet) ─── */
type LogLevel = "debug" | "info" | "warning" | "error";

interface LogEntry {
	id: string;
	level: LogLevel;
	/** ISO timestamp. */
	at: string;
	/** Emitting source / logger name. */
	source: string;
	message: string;
	/** Optional structured context shown in the drawer. */
	context?: Record<string, string>;
	/** Optional stack trace for errors. */
	stack?: string;
}

/* ─── Mock data ─── */
const LOGS: LogEntry[] = [
	{
		id: "l1",
		level: "info",
		at: "2026-06-09T10:42:18",
		source: "http.client",
		message: "GET /api/v1/requests завершён за 142 мс (200)",
		context: { method: "GET", status: "200", duration_ms: "142" },
	},
	{
		id: "l2",
		level: "warning",
		at: "2026-06-09T10:41:57",
		source: "auth.token",
		message: "Токен доступа истекает через 3 минуты, обновляю",
		context: { env: "staging", expires_in_s: "180" },
	},
	{
		id: "l3",
		level: "error",
		at: "2026-06-09T10:41:30",
		source: "http.client",
		message: "POST /api/v1/import — соединение прервано (ECONNRESET)",
		context: { method: "POST", host: "api.nexus.io", code: "ECONNRESET" },
		stack:
			"Error: socket hang up\n    at connResetException (node:internal/errors:705:14)\n    at TLSSocket.socketOnEnd (node:_http_client:519:23)\n    at TLSSocket.emit (node:events:525:35)",
	},
	{
		id: "l4",
		level: "debug",
		at: "2026-06-09T10:40:12",
		source: "store.request",
		message: "Применён фильтр method=GET,POST, перезапрос списка",
		context: { filter: "method=GET,POST", page: "1" },
	},
	{
		id: "l5",
		level: "info",
		at: "2026-06-09T10:39:48",
		source: "environment",
		message: "Активное окружение переключено на «Production»",
		context: { from: "staging", to: "production" },
	},
	{
		id: "l6",
		level: "debug",
		at: "2026-06-09T10:38:05",
		source: "platform.docs",
		message: "Кэш документации платформы инвалидирован",
		context: { platform_id: "pf_31", reason: "manual-refresh" },
	},
	{
		id: "l7",
		level: "error",
		at: "2026-06-09T10:37:21",
		source: "import.parser",
		message:
			"Не удалось разобрать файл импорта: неожиданный токен на строке 14",
		context: { file: "nexus-import.json", line: "14" },
		stack:
			"SyntaxError: Unexpected token } in JSON at position 482\n    at JSON.parse (<anonymous>)\n    at parseImport (import.parser.ts:58:21)",
	},
	{
		id: "l8",
		level: "info",
		at: "2026-06-09T10:36:00",
		source: "app",
		message: "Приложение запущено, версия 0.4.2",
		context: { version: "0.4.2", mode: "production" },
	},
];

/* ─── Filters ─── */
const LEVEL_FILTERS: { id: LogLevel | "all"; label: string }[] = [
	{ id: "all", label: "Все" },
	{ id: "debug", label: "Debug" },
	{ id: "info", label: "Info" },
	{ id: "warning", label: "Warning" },
	{ id: "error", label: "Error" },
];

const LEVEL_LABEL: Record<LogLevel, string> = {
	debug: "DEBUG",
	info: "INFO",
	warning: "WARN",
	error: "ERROR",
};

/* ─── Helpers ─── */
/** ISO `at` → "DD.MM HH:MM:SS" (no timezone shift). */
function formatAt(iso: string): string {
	const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
	if (!m) return iso;
	const [, , mo, d, hh, mm, ss] = m;
	return `${d}.${mo} ${hh}:${mm}:${ss}`;
}

/* ─── Page ─── */
export const LogsPage: FC = () => {
	const [search, setSearch] = useState("");
	const [activeLevel, setActiveLevel] = useState<LogLevel | "all">("all");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const rows = useMemo(() => {
		const q = search.trim().toLowerCase();
		return LOGS.filter((log) => {
			if (activeLevel !== "all" && log.level !== activeLevel) return false;
			if (!q) return true;
			return (
				log.message.toLowerCase().includes(q) ||
				log.source.toLowerCase().includes(q)
			);
		});
	}, [search, activeLevel]);

	const selected = rows.find((r) => r.id === selectedId) ?? null;

	const counts = useMemo(() => {
		const c: Record<string, number> = {};
		for (const log of LOGS) c[log.level] = (c[log.level] ?? 0) + 1;
		return c;
	}, []);

	return (
		<div className={s["lg-frame"]}>
			<Header section="Логи" activeLink="logs" />

			<div className={s["lg-body"]}>
				<Sidebar />

				<main className={s["lg-page"]}>
					<div className={s["lg-page-inner"]}>
						{/* Toolbar */}
						<div className={s["lg-toolbar"]}>
							<div className={s["lg-toolbar-head"]}>
								<div>
									<h1 className={s["lg-title"]}>Логи</h1>
									<p className={s["lg-subtitle"]}>
										Системные события приложения. Кликните строку, чтобы
										посмотреть детали.
									</p>
								</div>
								<button type="button" className={s["lg-btn"]}>
									<DownloadIcon size={13} />
									Экспорт
								</button>
							</div>

							<div className={s["lg-toolbar-controls"]}>
								<label className={s["lg-search"]}>
									<SearchIcon />
									<input
										type="text"
										placeholder="Поиск по сообщению или источнику…"
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
								</label>

								<div className={s["lg-chips"]}>
									{LEVEL_FILTERS.map((f) => (
										<button
											key={f.id}
											type="button"
											className={cx(
												s["lg-chip"],
												activeLevel === f.id && s.active,
											)}
											onClick={() => setActiveLevel(f.id)}
										>
											{f.label}
											{f.id !== "all" && (
												<span className={s["lg-chip-count"]}>
													{counts[f.id] ?? 0}
												</span>
											)}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Table */}
						<div className={s["lg-table"]}>
							<div className={cx(s["lg-row"], s["lg-head"])}>
								<span>Уровень</span>
								<span>Время</span>
								<span>Источник</span>
								<span>Сообщение</span>
							</div>

							{rows.length === 0 ? (
								<div className={s["lg-empty"]}>
									Нет записей по заданным условиям
								</div>
							) : (
								rows.map((log) => (
									<button
										key={log.id}
										type="button"
										className={cx(
											s["lg-row"],
											s["lg-row-btn"],
											selectedId === log.id && s.active,
										)}
										onClick={() => setSelectedId(log.id)}
									>
										<span>
											<span
												className={cx(s["lg-level"], s[`lg-lv-${log.level}`])}
											>
												<span className={s["lg-dot"]} />
												{LEVEL_LABEL[log.level]}
											</span>
										</span>
										<span className={cx(s["lg-mono"], s["lg-muted"])}>
											{formatAt(log.at)}
										</span>
										<span className={s["lg-mono"]}>{log.source}</span>
										<span className={s["lg-msg"]}>{log.message}</span>
									</button>
								))
							)}
						</div>
					</div>
				</main>
			</div>

			{/* Detail drawer */}
			{selected && (
				<>
					<div
						className={s["lg-scrim"]}
						onClick={() => setSelectedId(null)}
						aria-hidden
					/>
					<aside className={s["lg-drawer"]}>
						<div className={s["lg-drawer-head"]}>
							<span className={cx(s["lg-level"], s[`lg-lv-${selected.level}`])}>
								<span className={s["lg-dot"]} />
								{LEVEL_LABEL[selected.level]}
							</span>
							<span className={cx(s["lg-mono"], s["lg-muted"])}>
								{formatAt(selected.at)}
							</span>
							<span className={s["lg-drawer-spacer"]} />
							<button
								type="button"
								className={s["lg-drawer-close"]}
								onClick={() => setSelectedId(null)}
							>
								<CloseIcon />
							</button>
						</div>

						<div className={s["lg-drawer-scroll"]}>
							<div className={s["lg-section"]}>
								<div className={s["lg-sec-title"]}>Сообщение</div>
								<p className={s["lg-drawer-msg"]}>{selected.message}</p>
								<div className={s["lg-meta-line"]}>
									<span className={s["lg-mono"]}>{selected.source}</span>
								</div>
							</div>

							{selected.context && (
								<div className={s["lg-section"]}>
									<div className={s["lg-sec-title"]}>Контекст</div>
									<div className={s["lg-kv"]}>
										{Object.entries(selected.context).map(([k, v]) => (
											<div key={k} className={s["lg-kv-row"]}>
												<span className={s["lg-kv-key"]}>{k}</span>
												<span className={s["lg-kv-val"]}>{v}</span>
											</div>
										))}
									</div>
								</div>
							)}

							{selected.stack && (
								<div className={s["lg-section"]}>
									<div className={s["lg-sec-title"]}>Трассировка</div>
									<pre className={s["lg-code"]}>{selected.stack}</pre>
								</div>
							)}
						</div>
					</aside>
				</>
			)}
		</div>
	);
};
