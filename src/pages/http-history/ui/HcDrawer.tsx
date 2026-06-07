import { type FC, Fragment, useEffect, useState } from "react";
import { cx } from "@/shared/lib/cx";
import type { HistoryRecord, HistoryTiming } from "../model/types";
import s from "./HttpHistoryPage.module.css";

/* ─── Icons ─── */
const CopyIcon: FC<{ size?: number }> = ({ size = 12 }) => (
	<svg
		viewBox="0 0 14 14"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
	>
		<rect x="4.5" y="4.5" width="8" height="8" rx="1.5" />
		<path
			d="M9 4.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.5"
			strokeLinecap="round"
		/>
	</svg>
);

/* ─── Helpers ─── */
export function hcStatusClass(code: number): string {
	if (code === 0) return "err";
	return "s" + String(code)[0];
}

const STATUS_TEXT: Record<number, string> = {
	0: "Нет ответа",
	200: "OK",
	201: "Created",
	204: "No Content",
	301: "Moved Permanently",
	304: "Not Modified",
	400: "Bad Request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "Not Found",
	409: "Conflict",
	422: "Unprocessable Entity",
	429: "Too Many Requests",
	500: "Internal Server Error",
	503: "Service Unavailable",
};
function hcStatusText(code: number): string {
	return STATUS_TEXT[code] || "";
}

/* Full-URL highlight: scheme://host/path?query */
const HcUrl: FC<{ url: string; host?: string }> = ({ url, host }) => {
	const m = url.match(/^(https?:\/\/)([^/]+)(.*)$/);
	let scheme = "";
	let h = host || "";
	let rest = url;
	if (m) {
		scheme = m[1];
		h = m[2];
		rest = m[3];
	}
	const [base, query] = rest.split("?");
	const segs = base.split("/");
	return (
		<>
			{scheme && <span className={s.scheme}>{scheme}</span>}
			<span className={s.host}>{h}</span>
			{segs.map((p, i) => {
				if (p === "" && i === 0) return null;
				const isId =
					/^\d+$/.test(p) || /^[0-9a-f]{8,}$/i.test(p) || /^[a-z]{3}_/.test(p);
				return (
					<Fragment key={`${i}-${p}`}>
						{"/"}
						<span className={isId ? s["seg-id"] : undefined}>{p}</span>
					</Fragment>
				);
			})}
			{query && <span className={s["seg-q"]}>?{query}</span>}
		</>
	);
};

/* JSON syntax highlight (rough, for mock data) — token colors inlined. */
const JSON_COLORS = {
	key: "#3F6B4A",
	str: "#75591A",
	num: "#3A5A78",
	bool: "#9B3B36",
};
const HcJson: FC<{ src: string }> = ({ src }) => {
	const html = src
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(
			/"([^"]+)":/g,
			`<span style="color:${JSON_COLORS.key}">"$1"</span>:`,
		)
		.replace(
			/: "([^"]*)"/g,
			`: <span style="color:${JSON_COLORS.str}">"$1"</span>`,
		)
		.replace(
			/: (-?\d+\.?\d*)/g,
			`: <span style="color:${JSON_COLORS.num}">$1</span>`,
		)
		.replace(
			/: (true|false|null)/g,
			`: <span style="color:${JSON_COLORS.bool}">$1</span>`,
		);
	return (
		<pre
			className={s["hc-code-body"]}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: highlighting trusted local mock JSON
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
};

const HcCopyBtn: FC<{ text: string; label?: string }> = ({
	text,
	label = "Копировать",
}) => {
	const [done, setDone] = useState(false);
	return (
		<button
			className={s["hc-code-copy"]}
			onClick={() => {
				try {
					navigator.clipboard?.writeText(text);
				} catch {
					/* clipboard unavailable */
				}
				setDone(true);
				setTimeout(() => setDone(false), 1200);
			}}
		>
			<CopyIcon />
			{done ? "Скопировано" : label}
		</button>
	);
};

/* ─── Request side: params / headers / body ─── */
const HcRequestBlock: FC<{ r: HistoryRecord }> = ({ r }) => {
	const tabs = [
    { id: "body", lbl: "Тело", count: r.body ? null : 0 },
		{ id: "headers", lbl: "Заголовки", count: r.headers.length },
	] as const;
	const [tab, setTab] = useState<"params" | "headers" | "body">(
		r.body ? "body" : r.params.length ? "params" : "headers",
	);

	return (
		<div className={s["hc-section"]}>
			<div className={s["hc-sec-head"]}>
				<span className={s["hc-sec-title"]}>Запрос</span>
				<span className={s["hc-sec-rule"]} />
			</div>
			<div className={s["hc-tabs"]}>
				{tabs.map((t) => (
					<button
						key={t.id}
						className={cx(s["hc-tab"], tab === t.id && s.active)}
						onClick={() => setTab(t.id)}
					>
						{t.lbl}
						{t.count != null && (
							<span className={s["hc-tab-count"]}>{t.count}</span>
						)}
					</button>
				))}
			</div>

			{tab === "headers" && (
				<div className={s["hc-kv"]}>
					{r.headers.map(([k, v, tok]) => (
						<div className={s["hc-kv-row"]} key={k}>
							<span className={s["hc-kv-key"]}>{k}</span>
							<span className={s["hc-kv-val"]}>
								{tok ? <span className={s.tok}>{v}</span> : v}
							</span>
						</div>
					))}
				</div>
			)}

			{tab === "body" &&
				(r.body ? (
					<div className={s["hc-code"]}>
						<div className={s["hc-code-head"]}>
							<span className={s["hc-code-lang"]}>JSON · тело запроса</span>
							<HcCopyBtn text={r.body} />
						</div>
						<HcJson src={r.body} />
					</div>
				) : (
					<div className={s["hc-none"]}>У запроса {r.method} нет тела</div>
				))}
		</div>
	);
};

/* ─── Timing waterfall ─── */
const HcTiming: FC<{ t: HistoryTiming; total: number }> = ({ t, total }) => {
	const sum = t.dns + t.conn + t.tls + t.wait + t.dl || 1;
	const pct = (n: number) => `${(n / sum) * 100}%`;
	const items = (
		[
			{ k: "dns", lbl: "DNS-поиск", v: t.dns },
			{ k: "conn", lbl: "Соединение", v: t.conn },
			{ k: "tls", lbl: "TLS-рукопожатие", v: t.tls },
			{ k: "wait", lbl: "Ожидание (TTFB)", v: t.wait },
			{ k: "dl", lbl: "Загрузка", v: t.dl },
		] as const
	).filter((it) => it.v > 0);
	return (
		<div>
			<div className={s["hc-timing-track"]}>
				{items.map((it) => (
					<div
						key={it.k}
						className={cx(s["hc-tseg"], s[it.k])}
						style={{ width: pct(it.v) }}
						title={`${it.lbl}: ${it.v} мс`}
					/>
				))}
			</div>
			<div className={s["hc-timing-legend"]}>
				{items.map((it) => (
					<span key={it.k} className={s["hc-timing-item"]}>
						<span className={cx(s.sw, s["hc-tseg"], s[it.k])} />
						{it.lbl} · <span className={s.ms}>{it.v} мс</span>
					</span>
				))}
				<span className={s["hc-timing-item"]} style={{ marginLeft: "auto" }}>
					Итого · <span className={s.ms}>{total} мс</span>
				</span>
			</div>
		</div>
	);
};

/* ─── Response side ─── */
const HcResponseBlock: FC<{ r: HistoryRecord }> = ({ r }) => {
	const tabs = [
		{ id: "body", lbl: "Тело", count: undefined, disabled: false },
		{
			id: "headers",
			lbl: "Заголовки",
			count: r.respHeaders.length,
			disabled: false,
		},
		{ id: "timing", lbl: "Тайминг", count: undefined, disabled: !r.timing },
	] as const;
	const [tab, setTab] = useState<"body" | "headers" | "timing">("body");
	const sc = hcStatusClass(r.status);
	const slow = r.duration >= 1000;

	return (
		<>
			<div className={s["hc-respbar"]}>
				{r.isError ? (
					<span className={cx(s["hc-resp-status"], s.s5)}>
						<span className={s.sdot} />
						Ошибка
					</span>
				) : (
					<span className={cx(s["hc-resp-status"], s[sc])}>
						<span className={s.sdot} />
						{r.status} {hcStatusText(r.status)}
					</span>
				)}
				<div className={s["hc-resp-metric"]}>
					<span className={cx(s.v, slow && s.slow)}>
						{r.isError ? "—" : r.duration + " мс"}
					</span>
					<span className={s.l}>Время</span>
				</div>
				<div className={s["hc-resp-metric"]}>
					<span className={s.v}>{r.size}</span>
					<span className={s.l}>Размер</span>
				</div>
				<div className={s["hc-resp-spacer"]} />
				<span className={s["hc-resp-when"]}>{r.sentAt}</span>
			</div>

			<div className={s["hc-section"]}>
				<div className={s["hc-sec-head"]}>
					<span className={s["hc-sec-title"]}>Ответ</span>
					<span className={s["hc-sec-rule"]} />
				</div>
				<div className={s["hc-tabs"]}>
					{tabs.map((t) => (
						<button
							key={t.id}
							className={cx(s["hc-tab"], tab === t.id && s.active)}
							disabled={t.disabled}
							style={
								t.disabled ? { opacity: 0.4, cursor: "default" } : undefined
							}
							onClick={() => !t.disabled && setTab(t.id)}
						>
							{t.lbl}
							{t.count != null && (
								<span className={s["hc-tab-count"]}>{t.count}</span>
							)}
						</button>
					))}
				</div>

				{tab === "body" && (
					<div className={s["hc-code"]}>
						<div className={s["hc-code-head"]}>
							<span className={s["hc-code-lang"]}>
								{r.isError
									? "Текст · ошибка соединения"
									: `JSON · ответ · ${r.status}`}
							</span>
							{!r.isError && <HcCopyBtn text={r.response} />}
						</div>
						{r.isError ? (
							<pre
								className={s["hc-code-body"]}
								style={{ color: "var(--error-fg)" }}
							>
								{r.response}
							</pre>
						) : (
							<HcJson src={r.response} />
						)}
					</div>
				)}

				{tab === "headers" &&
					(r.respHeaders.length ? (
						<div className={s["hc-kv"]}>
							{r.respHeaders.map(([k, v]) => (
								<div className={s["hc-kv-row"]} key={k}>
									<span className={s["hc-kv-key"]}>{k}</span>
									<span className={s["hc-kv-val"]}>{v}</span>
								</div>
							))}
						</div>
					) : (
						<div className={s["hc-none"]}>Заголовки ответа недоступны</div>
					))}

				{tab === "timing" && r.timing && (
					<HcTiming t={r.timing} total={r.duration} />
				)}
			</div>
		</>
	);
};

/* ─── Drawer (view-only) ─── */
export const HcDrawer: FC<{ r: HistoryRecord; onClose: () => void }> = ({
	r,
	onClose,
}) => {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: scrim closes the drawer on click */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled at window level */}
			<div className={s["hc-drawer-scrim"]} onClick={onClose} />
			<div
				className={s["hc-drawer"]}
				role="dialog"
				aria-label="Просмотр запроса"
			>
				<div className={s["hc-drawer-head"]}>
					<div className={s["hc-drawer-head-top"]}>
						<span className={s["hc-drawer-title"]}></span>
						<button
							className={s["hc-drawer-close"]}
							onClick={onClose}
							aria-label="Закрыть"
						>
							<svg
								viewBox="0 0 14 14"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
							>
								<path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
							</svg>
						</button>
					</div>
					<div className={s["hc-urlbar"]}>
						<span
							className={cx(
								s["hc-urlbar-method"],
								s[`hc-m-${r.method.toLowerCase()}`],
							)}
						>
							{r.method}
						</span>
						<div className={s["hc-urlbar-url"]}>
							<HcUrl url={r.url} />
						</div>
						<button
							className={s["hc-copy-url"]}
							title="Скопировать URL"
							onClick={() => {
								try {
									navigator.clipboard?.writeText(r.url);
								} catch {
									/* clipboard unavailable */
								}
							}}
						>
							<CopyIcon size={13} />
						</button>
					</div>
				</div>
				<div className={s["hc-drawer-scroll"]}>
					<HcResponseBlock r={r} />
					<HcRequestBlock r={r} />
				</div>
			</div>
		</>
	);
};
