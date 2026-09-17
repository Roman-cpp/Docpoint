import { type FC, useMemo, useRef, useState } from "react";
import {
	type ResponseHeader,
	selectResponse,
	useResponseStore,
} from "@/features/request";
import { collectSetCookies } from "@/shared/lib/set-cookie";
import { JsonTree, type JsonTreeHandle } from "@/shared/ui-kit/data-display";
import s from "./BottomConsolePanel.module.css";

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

/** Имена заголовков бэкенд отдаёт в нижнем регистре, но полагаться на это незачем. */
function findHeader(headers: ResponseHeader[] | undefined, name: string) {
	return headers?.find((h) => h.key.toLowerCase() === name)?.value;
}

/* ── Компонент ────────────────────────────────────────────────────── */

type Tab = "body" | "headers" | "cookies";

export const BottomConsolePanel: FC = () => {
	const response = useResponseStore(selectResponse);

	const [tab, setTab] = useState<Tab>("body");
	const [copied, setCopied] = useState(false);
	const [maximized, setMaximized] = useState(false);
	/** Раскрыто ли дерево целиком — от этого зависит вид кнопки-переключателя */
	const [treeExpanded, setTreeExpanded] = useState(false);

	const panelRef = useRef<HTMLDivElement>(null);
	const treeRef = useRef<JsonTreeHandle>(null);
	/** Запоминаем исходную высоту дока, чтобы вернуть её при сворачивании */
	const prevHeight = useRef<string>("");

	const body = response?.body ?? "";
	const parsed = useMemo(() => tryParseJson(body), [body]);
	const headers = response?.headers;

	/** Чем объяснить пустое тело: статус и то, что сервер сам сказал о содержимом. */
	const emptyHint = useMemo(() => {
		if (!response || response.error) return "";
		const parts = [`${response.status} ${response.statusText}`];
		const type = findHeader(headers, "content-type");
		const length = findHeader(headers, "content-length");
		if (type) parts.push(type);
		if (length !== undefined) parts.push(`content-length: ${length}`);
		return parts.join(" · ");
	}, [response, headers]);

	const headersText = useMemo(
		() => (headers ?? []).map((h) => `${h.key}: ${h.value}`).join("\n"),
		[headers],
	);

	// Куки, выставленные этим ответом: они же лежат среди заголовков, но
	// разобранные читаются иначе — видно, что за сессия только что пришла.
	const cookies = useMemo(() => collectSetCookies(headers), [headers]);
	const cookiesText = useMemo(
		() =>
			(headers ?? [])
				.filter((h) => h.key.toLowerCase() === "set-cookie")
				.map((h) => h.value)
				.join("\n"),
		[headers],
	);

	// Копируем то, что на экране: с вкладки заголовков тело копировать незачем.
	const copyText =
		tab === "body" ? body : tab === "headers" ? headersText : cookiesText;

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

	const toggleTree = () => {
		if (treeExpanded) treeRef.current?.collapseAll();
		else treeRef.current?.expandAll();
		setTreeExpanded((v) => !v);
	};

	/**
	 * При уходе с вкладки дерево размонтируется и теряет своё состояние
	 * раскрытия — сбрасываем и вид кнопки, иначе они разъедутся.
	 */
	const selectTab = (next: Tab) => {
		if (next === tab) return;
		setTreeExpanded(false);
		setTab(next);
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(copyText);
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
					onClick={() => selectTab("body")}
				>
					Тело ответа
				</button>
				<button
					type="button"
					className={`${s.tab} ${tab === "headers" ? s.tabActive : ""}`}
					onClick={() => selectTab("headers")}
				>
					Заголовки
				</button>
				<button
					type="button"
					className={`${s.tab} ${tab === "cookies" ? s.tabActive : ""}`}
					onClick={() => selectTab("cookies")}
				>
					Куки{cookies.length > 0 && ` (${cookies.length})`}
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

						{/* Управление деревом — только когда оно на экране */}
						{!response.error && tab === "body" && parsed.ok && (
							<button
								type="button"
								className={s.iconBtn}
								onClick={toggleTree}
								aria-pressed={treeExpanded}
								title={treeExpanded ? "Свернуть всё" : "Развернуть всё"}
								aria-label={treeExpanded ? "Свернуть всё" : "Развернуть всё"}
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
									{treeExpanded ? (
										// двойной шеврон вверх — свернуть
										<path d="M3.5 6.5L7 3l3.5 3.5M3.5 10.5L7 7l3.5 3.5" />
									) : (
										// двойной шеврон вниз — развернуть
										<path d="M3.5 3.5L7 7l3.5-3.5M3.5 7.5L7 11l3.5-3.5" />
									)}
								</svg>
							</button>
						)}

						{!response.error && copyText && (
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
					!body ? (
						// Пустое тело — это ответ, а не сбой панели: показываем, чем его
						// объяснил сервер, иначе экран выглядит сломанным.
						<div className={s.empty}>
							<div>
								<div>Сервер вернул ответ без тела</div>
								{emptyHint && <div className={s.emptyMeta}>{emptyHint}</div>}
							</div>
						</div>
					) : parsed.ok ? (
						<div className={s.contentTree}>
							<JsonTree
								ref={treeRef}
								data={parsed.value}
								size="sm"
								defaultExpandedDepth={2}
								className={s.tree}
							/>
						</div>
					) : (
						<div className={s.content}>
							<pre className={s.raw}>{body}</pre>
						</div>
					)
				) : tab === "headers" ? (
					headers?.length ? (
						<div className={s.headers}>
							{headers.map(({ key, value }) => (
								<div key={`${key}: ${value}`} className={s.headerRow}>
									<span className={s.headerKey}>{key}:</span>
									<span className={s.headerVal}>{value}</span>
								</div>
							))}
						</div>
					) : (
						<div className={s.empty}>Заголовки ответа недоступны</div>
					)
				) : cookies.length ? (
					<div className={s.headers}>
						{cookies.map((cookie) => (
							<div
								key={`${cookie.name}=${cookie.value}`}
								className={s.cookieRow}
							>
								<span className={s.headerKey}>{cookie.name}</span>
								<span className={s.headerVal}>{cookie.value}</span>
								{cookie.attrs.length > 0 && (
									<span className={s.cookieAttrs}>
										{cookie.attrs.join(" · ")}
									</span>
								)}
							</div>
						))}
					</div>
				) : (
					<div className={s.empty}>
						<div>
							<div>Этот ответ не выставил ни одной куки</div>
							<div className={s.emptyMeta}>
								Здесь появляется всё, что сервер прислал в Set-Cookie
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
