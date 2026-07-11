import { type FC, Fragment, useEffect, useState } from "react";
import { selectSelectedRequest, useRequestStore } from "@/features/request";
import { cx } from "@/shared/lib/cx";
import type { HistoryRecord } from "../../model/types";
import s from "../HttpHistoryPage.module.css";

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

/** ISO `sent_at` → "DD.MM HH:MM" (no timezone shift). */
function hcWhen(iso: string): string {
	const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
	if (!m) return iso;
	const [, , mo, d, hh, mm] = m;
	return `${d}.${mo} ${hh}:${mm}`;
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

/* JSON token colors. */
const JSON_COLORS = {
	key: "#3F6B4A",
	str: "#75591A",
	num: "#3A5A78",
	bool: "#9B3B36",
	punct: "var(--ink-low)",
};

/** Parse a JSON string (handling double-encoded values) into a value. */
function hcParseJson(
	src: string,
): { ok: true; value: unknown } | { ok: false } {
	try {
		let v: unknown = JSON.parse(src);
		if (typeof v === "string") {
			try {
				v = JSON.parse(v);
			} catch {
				/* single-encoded string value */
			}
		}
		return { ok: true, value: v };
	} catch {
		return { ok: false };
	}
}

const Caret: FC<{ open: boolean }> = ({ open }) => (
	<svg
		aria-hidden="true"
		viewBox="0 0 12 12"
		width={10}
		height={10}
		fill="none"
		stroke="currentColor"
		strokeWidth="1.7"
		strokeLinecap="round"
		strokeLinejoin="round"
		style={{
			transform: open ? "rotate(90deg)" : "none",
			transition: "transform .12s",
		}}
	>
		<path d="M4 2.5L8 6l-4 3.5" />
	</svg>
);

const HcJsonPrimitive: FC<{ value: unknown }> = ({ value }) => {
	if (typeof value === "string")
		return <span style={{ color: JSON_COLORS.str }}>"{value}"</span>;
	if (typeof value === "number")
		return <span style={{ color: JSON_COLORS.num }}>{String(value)}</span>;
	return <span style={{ color: JSON_COLORS.bool }}>{String(value)}</span>;
};

const HcJsonNode: FC<{ name?: string; value: unknown; last: boolean }> = ({
	name,
	value,
	last,
}) => {
	const isArr = Array.isArray(value);
	const isObj = !isArr && value !== null && typeof value === "object";
	const [open, setOpen] = useState(true);

	const comma = !last ? (
		<span style={{ color: JSON_COLORS.punct }}>,</span>
	) : null;
	const keyPart =
		name !== undefined ? (
			<>
				<span style={{ color: JSON_COLORS.key }}>"{name}"</span>
				<span style={{ color: JSON_COLORS.punct }}>: </span>
			</>
		) : null;

	if (!isArr && !isObj) {
		return (
			<div className={s["hc-json-row"]}>
				<span className={s["hc-json-caret"]} />
				{keyPart}
				<HcJsonPrimitive value={value} />
				{comma}
			</div>
		);
	}

	const entries: [string, unknown][] = isArr
		? (value as unknown[]).map((v, i) => [String(i), v])
		: Object.entries(value as Record<string, unknown>);
	const openBr = isArr ? "[" : "{";
	const closeBr = isArr ? "]" : "}";
	const empty = entries.length === 0;

	return (
		<div>
			<div
				className={s["hc-json-row"]}
				style={empty ? undefined : { cursor: "pointer" }}
				onClick={empty ? undefined : () => setOpen((o) => !o)}
			>
				<span className={s["hc-json-caret"]}>
					{!empty && <Caret open={open} />}
				</span>
				{keyPart}
				<span style={{ color: JSON_COLORS.punct }}>{openBr}</span>
				{(!open || empty) && (
					<>
						{!empty && (
							<span className={s["hc-json-count"]}>{entries.length}</span>
						)}
						<span style={{ color: JSON_COLORS.punct }}>{closeBr}</span>
						{comma}
					</>
				)}
			</div>
			{open && !empty && (
				<>
					<div className={s["hc-json-children"]}>
						{entries.map(([k, v], i) => (
							<HcJsonNode
								key={k}
								name={isArr ? undefined : k}
								value={v}
								last={i === entries.length - 1}
							/>
						))}
					</div>
					<div className={s["hc-json-row"]}>
						<span className={s["hc-json-caret"]} />
						<span style={{ color: JSON_COLORS.punct }}>{closeBr}</span>
						{comma}
					</div>
				</>
			)}
		</div>
	);
};

const HcJson: FC<{ src: string }> = ({ src }) => {
	const parsed = hcParseJson(src);
	if (!parsed.ok || parsed.value === null || typeof parsed.value !== "object") {
		return <pre className={s["hc-code-body"]}>{src}</pre>;
	}
	return (
		<div className={s["hc-json-tree"]}>
			<HcJsonNode value={parsed.value} last />
		</div>
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

/* ─── Request side: headers / body ─── */
const HcRequestBlock: FC<{ r: HistoryRecord }> = ({ r }) => {
	const tabs = [
		{ id: "body", lbl: "Тело", count: r.payload ? null : 0 },
		{ id: "headers", lbl: "Заголовки", count: r.payload_headers.length },
	] as const;
	const [tab, setTab] = useState<"headers" | "body">(
		r.payload ? "body" : "headers",
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
					{r.payload_headers.map((h) => {
						const tok = h.key.toLowerCase() === "authorization";
						return (
							<div className={s["hc-kv-row"]} key={h.key}>
								<span className={s["hc-kv-key"]}>{h.key}</span>
								<span className={s["hc-kv-val"]}>
									{tok ? <span className={s.tok}>{h.value}</span> : h.value}
								</span>
							</div>
						);
					})}
				</div>
			)}

			{tab === "body" &&
				(r.payload ? (
					<div className={s["hc-code"]}>
						<div className={s["hc-code-head"]}>
							<span className={s["hc-code-lang"]}>JSON · тело запроса</span>
							<HcCopyBtn text={r.payload} />
						</div>
						<HcJson src={r.payload} />
					</div>
				) : (
					<div className={s["hc-none"]}>У запроса {r.method} нет тела</div>
				))}
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
			count: r.response_headers.length,
			disabled: false,
		},
	] as const;
	const [tab, setTab] = useState<"body" | "headers">("body");
	const status = Number(r.code) || 0;
	const isError = status === 0;
	const sc = hcStatusClass(status);
	const slow = r.duration >= 1000;

	return (
		<>
			<div className={s["hc-respbar"]}>
				{isError ? (
					<span className={cx(s["hc-resp-status"], s.s5)}>
						<span className={s.sdot} />
						Ошибка
					</span>
				) : (
					<span className={cx(s["hc-resp-status"], s[sc])}>
						<span className={s.sdot} />
						{r.code} {hcStatusText(status)}
					</span>
				)}
				<div className={s["hc-resp-metric"]}>
					<span className={cx(s.v, slow && s.slow)}>
						{isError ? "—" : `${r.duration} мс`}
					</span>
					<span className={s.l}>Время</span>
				</div>
				<div className={s["hc-resp-spacer"]} />
				<span className={s["hc-resp-when"]}>{hcWhen(r.sent_at)}</span>
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
								{isError
									? "Текст · ошибка соединения"
									: `JSON · ответ · ${r.code}`}
							</span>
							{!isError && <HcCopyBtn text={r.response} />}
						</div>
						{isError ? (
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
					(r.response_headers.length ? (
						<div className={s["hc-kv"]}>
							{r.response_headers.map((h) => (
								<div className={s["hc-kv-row"]} key={h.key}>
									<span className={s["hc-kv-key"]}>{h.key}</span>
									<span className={s["hc-kv-val"]}>{h.value}</span>
								</div>
							))}
						</div>
					) : (
						<div className={s["hc-none"]}>Заголовки ответа недоступны</div>
					))}
			</div>
		</>
	);
};

/* ─── Drawer (view-only) ─── */
export const HcDrawer: FC<{ onClose: () => void }> = ({ onClose }) => {
	const request = useRequestStore(selectSelectedRequest);

	if (!request)
		return (
			<>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: scrim closes the drawer on click */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled at window level */}
				<div className={s["hc-drawer-scrim"]} onClick={onClose} />
				<div
					className={s["hc-drawer"]}
					role="dialog"
					aria-label="Загрузка запроса"
				>
					<div className={s["hc-drawer-head"]}>
						<div className={s["hc-drawer-head-top"]}>
							<span className={s["hc-drawer-title"]} />
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
					</div>
					<div className={s["hc-drawer-scroll"]}>
						<div className={s["hc-none"]}>Загрузка…</div>
					</div>
				</div>
			</>
		);

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
								s[`hc-m-${request.method.toLowerCase()}`],
							)}
						>
							{request.method}
						</span>
						<div className={s["hc-urlbar-url"]}>
							<HcUrl url={request.url} />
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
					<HcResponseBlock r={request} />
					<HcRequestBlock r={request} />
				</div>
			</div>
		</>
	);
};
