import { type FC, useMemo, useRef, useState } from "react";
import { selectResponse, useResponseStore } from "@/features/request";
import s from "./BottomConsolePanel.module.css";
import { JsonTree } from "./JsonTree";

/* ── Цвет статуса (как в ResponseCard) ────────────────────────────── */

const sBg = (status: number) =>
	status < 300
		? "var(--green-bg)"
		: status < 500
			? "var(--amber-bg)"
			: "var(--red-bg)";

const sClr = (status: number) =>
	status < 300 ? "var(--green)" : status < 500 ? "var(--amber)" : "var(--red)";

// Тело приходит строкой: пытаемся разобрать как JSON для дерева, иначе
// показываем как есть.
function tryParseJson(
	text: string,
): { ok: true; value: unknown } | { ok: false } {
	const t = text.trimStart();
	if (!t.startsWith("{") && !t.startsWith("[")) return { ok: false };
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch {
		return { ok: false };
	}
}

/* ── Компонент ────────────────────────────────────────────────────── */

type Tab = "body" | "headers";

export const BottomConsolePanel: FC = () => {
	const response = useResponseStore(selectResponse);

	const [tab, setTab] = useState<Tab>("body");
	const [copied, setCopied] = useState(false);
	const [maximized, setMaximized] = useState(false);

	const panelRef = useRef<HTMLDivElement>(null);
	/** Запоминаем исходную высоту дока, чтобы вернуть её при сворачивании */
	const prevHeight = useRef<string>("");

	const body = response?.body ?? "";
	const parsed = useMemo(() => tryParseJson(body), [body]);

	const toggleMaximize = () => {
		// родитель нашего корня — это div блока DockLayout.Bottom с inline-высотой
		const dock = panelRef.current?.parentElement;
		const center = dock?.parentElement;
		if (!dock || !center) return;

		if (!maximized) {
			prevHeight.current = dock.style.height;
			// заполняем всю центральную колонку — Main сожмётся за счёт flex
			dock.style.height = `${center.clientHeight}px`;
			setMaximized(true);
		} else {
			dock.style.height = prevHeight.current;
			setMaximized(false);
		}
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(body);
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		} catch {
			/* clipboard недоступен — игнорируем */
		}
	};

	const status = response?.status ?? 0;

	return (
		<div className={s.panel} ref={panelRef}>
			<div className={s.tabs}>
				<button
					type="button"
					className={`${s.tab} ${tab === "body" ? s.tabActive : ""}`}
					onClick={() => setTab("body")}
				>
					Тело ответа
				</button>
				<button
					type="button"
					className={`${s.tab} ${tab === "headers" ? s.tabActive : ""}`}
					onClick={() => setTab("headers")}
				>
					Заголовки
				</button>

				{response && (
					<div className={s.meta}>
						{response.error ? (
							<span
								className={s.statusBadge}
								style={{ background: "var(--red-bg)", color: "var(--red)" }}
							>
								Error
							</span>
						) : (
							<span
								className={s.statusBadge}
								style={{ background: sBg(status), color: sClr(status) }}
							>
								{response.status} {response.statusText}
							</span>
						)}
						<span className={s.dur}>{response.dur}ms</span>
						{!response.error && (
							<button type="button" className={s.copyBtn} onClick={copy}>
								{copied ? "Скопировано" : "Копировать"}
							</button>
						)}
						<button
							type="button"
							className={s.iconBtn}
							onClick={toggleMaximize}
							aria-pressed={maximized}
							title={maximized ? "Свернуть" : "Развернуть на всю высоту"}
							aria-label={maximized ? "Свернуть" : "Развернуть на всю высоту"}
						>
							<svg
								viewBox="0 0 14 14"
								width="14"
								height="14"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								{maximized ? (
									// стрелки внутрь — свернуть
									<path d="M8.5 5.5L12 2M12 2H9M12 2V5M5.5 8.5L2 12M2 12H5M2 12V9" />
								) : (
									// стрелки наружу — развернуть
									<path d="M9 2h3v3M5 12H2V9M12 2L8.5 5.5M2 12l3.5-3.5" />
								)}
							</svg>
						</button>
					</div>
				)}
			</div>

			<div className={s.body}>
				{!response ? (
					<div className={s.empty}>
						Отправьте запрос в панели «Try it», чтобы увидеть ответ
					</div>
				) : response.error ? (
					<div className={s.error}>Network error: {response.error}</div>
				) : tab === "body" ? (
					parsed.ok ? (
						<div className={s.content}>
							<JsonTree value={parsed.value} />
						</div>
					) : (
						<div className={s.content}>
							<pre className={s.raw}>{body || "(empty)"}</pre>
						</div>
					)
				) : (
					// Заголовки ответа пока не возвращаются бэкендом (send_request
					// отдаёт только status/body/duration), поэтому показываем заглушку.
					<div className={s.empty}>Заголовки ответа недоступны</div>
				)}
			</div>
		</div>
	);
};
