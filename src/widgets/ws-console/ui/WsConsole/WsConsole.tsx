import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
	type FC,
	type KeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@/shared/svg";
import {
	createHeaderDraft,
	type HeaderDraft,
	HeadersEditor,
} from "@/shared/ui-kit/controls";
import s from "./WsConsole.module.css";

/* ─── TYPES ──────────────────────────────────── */
type Direction = "in" | "out";
type EntryKind = Direction | "system" | "error";

interface WsMessage {
	id: number;
	kind: EntryKind;
	text: string;
	ts: string;
}

/** Events pushed from the backend over the `ws://{id}` channel. Mirrors the
 *  Rust `WsEvent` enum (`#[serde(tag = "kind", rename_all = "lowercase")]`). */
type WsEvent =
	| { kind: "open" }
	| { kind: "message"; text: string }
	| { kind: "closed"; code: number | null; reason: string }
	| { kind: "error"; message: string };

/** Frame the editor starts with when a page has nothing better to offer. */
export const DEFAULT_WS_DRAFT = `{ "op": "subscribe", "id": "init", "streams": "kline.exchange.symbol.interval" }`;

const TABS = ["Message", "Params", "Headers", "Settings"] as const;
type Tab = (typeof TABS)[number];

/**
 * Заголовки рукопожатия для бэкенда: включённые строки с непустым именем,
 * последняя одноимённая побеждает.
 */
function collectHeaders(headers: HeaderDraft[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (const header of headers) {
		const name = header.name.trim();
		if (!header.enabled || !name) continue;
		for (const existing of Object.keys(result)) {
			if (existing.toLowerCase() === name.toLowerCase())
				delete result[existing];
		}
		result[name] = header.value;
	}
	return result;
}

const now = () => {
	const d = new Date();
	const ms = String(d.getMilliseconds()).padStart(3, "0");
	return `${d.toTimeString().slice(0, 8)}.${ms}`;
};

/** Try to pretty-print a JSON string; fall back to the raw text. */
function prettyJson(text: string): string {
	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return text;
	}
}

/* ─── DIRECTION ICONS ────────────────────────── */
/* ─── SYSTEM ROW (open / closed / error / status) ── */
const SystemRow: FC<{ msg: WsMessage }> = ({ msg }) => (
	<div className={s.systemRow}>
		<span
			className={`${s.systemIcon}${msg.kind === "error" ? " " + s.systemError : ""}`}
		>
			{msg.kind === "error" ? (
				<svg
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<circle cx="8" cy="8" r="6.5" />
					<path d="M8 5v3.5M8 11h.01" />
				</svg>
			) : (
				<svg
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<circle cx="8" cy="8" r="6.5" />
					<path d="M5 8l2 2 4-4" />
				</svg>
			)}
		</span>
		<span className={s.systemText}>{msg.text}</span>
		<span className={s.logTime}>{msg.ts}</span>
	</div>
);

/* ─── LOG ROW ────────────────────────────────── */
const LogRow: FC<{ msg: WsMessage }> = ({ msg }) => {
	const [open, setOpen] = useState(false);

	if (msg.kind === "system" || msg.kind === "error") {
		return <SystemRow msg={msg} />;
	}

	const pretty = prettyJson(msg.text);
	const lines = pretty.split("\n");

	return (
		<div className={s.logRow}>
			<div className={s.logRowHead} onClick={() => setOpen((o) => !o)}>
				<span className={`${s.dirIcon} ${msg.kind === "out" ? s.out : s.in}`}>
					{msg.kind === "out" ? <ArrowUpIcon /> : <ArrowDownIcon />}
				</span>
				<span className={s.logText}>{msg.text}</span>
				<span className={s.logTime}>{msg.ts}</span>
				<svg
					className={`${s.chevron}${open ? " " + s.open : ""}`}
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M3 4.5L6 7.5 9 4.5" />
				</svg>
			</div>

			{open && (
				<div className={s.logDetail}>
					<div className={s.detailToolbar}>
						<select className={s.formatSelect} defaultValue="JSON">
							<option>JSON</option>
							<option>Raw</option>
						</select>
						<div className={s.detailSpacer} />
						<button className={s.detailAction}>Show Hexdump</button>
					</div>
					<div className={s.detailCode}>
						<div className={s.detailGutter}>
							{lines.map((_, i) => (
								<div key={i}>{i + 1}</div>
							))}
						</div>
						<pre className={s.detailPre}>{pretty}</pre>
					</div>
				</div>
			)}
		</div>
	);
};

export interface WsConsoleProps {
	/** Адрес, которым заполняется строка подключения. Смена значения (например,
	 *  после загрузки doc-ws) переписывает поле, пока сокет не тронули руками. */
	initialUrl?: string;
	/** Кадр в редакторе. Управляется страницей, чтобы в него можно было
	 *  подставить сохранённое сообщение. */
	draft: string;
	onDraftChange: (value: string) => void;
}

/**
 * Живое подключение к WebSocket: строка адреса, редактор кадра с заголовками
 * рукопожатия и журнал сообщений. Ничего не знает о документации — сокет может
 * быть как описанным в doc-ws, так и произвольным.
 */
export const WsConsole: FC<WsConsoleProps> = ({
	initialUrl = "ws://localhost:8080/ws",
	draft,
	onDraftChange,
}) => {
	const [url, setUrl] = useState(initialUrl);
	const [connId, setConnId] = useState<string | null>(null);
	const [connecting, setConnecting] = useState(false);
	const [tab, setTab] = useState<Tab>("Message");
	/* Заголовки рукопожатия. Живут только на время сессии страницы; токен
	   окружения бэкенд подставляет сам, если своего `Authorization`/`Cookie`
	   здесь нет. */
	const [headers, setHeaders] = useState<HeaderDraft[]>([]);
	const [messages, setMessages] = useState<WsMessage[]>([]);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<"all" | "in" | "out">("all");
	const [editorHeight, setEditorHeight] = useState(300);

	// Адрес приходит из документации асинхронно, поэтому его подхватывают во
	// время рендера, а не в эффекте: иначе первый кадр показал бы заглушку.
	const [seededUrl, setSeededUrl] = useState(initialUrl);
	if (initialUrl !== seededUrl) {
		setSeededUrl(initialUrl);
		setUrl(initialUrl);
	}

	const connected = connId !== null;

	/* Refs so unmount cleanup and event handlers see the latest values. */
	const unlistenRef = useRef<UnlistenFn | null>(null);
	const connIdRef = useRef<string | null>(null);
	connIdRef.current = connId;
	const seqRef = useRef(0);

	const push = useCallback((kind: EntryKind, text: string) => {
		setMessages((m) => [...m, { id: ++seqRef.current, kind, text, ts: now() }]);
	}, []);

	const teardown = useCallback(() => {
		unlistenRef.current?.();
		unlistenRef.current = null;
		setConnId(null);
	}, []);

	const connect = useCallback(async () => {
		if (connIdRef.current || connecting) return;
		setConnecting(true);
		try {
			// Generate the id up front so the listener is registered *before* the
			// socket opens — otherwise the initial Open/first frames can be missed.
			// NB: avoid crypto.randomUUID() — it requires a secure context, which
			// the Tauri webview is not on Linux, and would throw here.
			const id = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
			const unlisten = await listen<WsEvent>(`ws://${id}`, (evt) => {
				const p = evt.payload;
				switch (p.kind) {
					case "open":
						push("system", `Connected to ${url}`);
						break;
					case "message":
						push("in", p.text);
						break;
					case "closed":
						push(
							"system",
							`Disconnected${p.code != null ? ` (${p.code})` : ""}${
								p.reason ? `: ${p.reason}` : ""
							}`,
						);
						teardown();
						break;
					case "error":
						push("error", p.message);
						teardown();
						break;
				}
			});
			unlistenRef.current = unlisten;
			await invoke<string>("ws_connect", {
				url,
				id,
				headers: collectHeaders(headers),
			});
			setConnId(id);
		} catch (err) {
			unlistenRef.current?.();
			unlistenRef.current = null;
			push("error", String(err));
		} finally {
			setConnecting(false);
		}
	}, [url, headers, connecting, teardown, push]);

	const disconnect = useCallback(async () => {
		const id = connIdRef.current;
		if (!id) return;
		try {
			await invoke("ws_disconnect", { id });
		} catch (err) {
			push("error", String(err));
		}
		teardown();
	}, [teardown, push]);

	const toggleConnection = () => {
		if (connected) disconnect();
		else connect();
	};

	/* Close the socket and drop the listener when the page unmounts. */
	useEffect(
		() => () => {
			unlistenRef.current?.();
			const id = connIdRef.current;
			if (id) invoke("ws_disconnect", { id });
		},
		[],
	);

	const send = async () => {
		const text = draft.trim();
		if (!text || !connId) return;
		try {
			await invoke("ws_send", { id: connId, text });
			push("out", text);
		} catch (err) {
			push("error", String(err));
		}
	};

	const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			send();
		}
	};

	const startVResize = useCallback(
		(e: ReactMouseEvent) => {
			e.preventDefault();
			const startY = e.clientY;
			const startH = editorHeight;
			document.body.style.userSelect = "none";
			document.body.style.cursor = "row-resize";
			const onMove = (ev: globalThis.MouseEvent) => {
				setEditorHeight(
					Math.max(140, Math.min(560, startH + ev.clientY - startY)),
				);
			};
			const onUp = () => {
				document.body.style.userSelect = "";
				document.body.style.cursor = "";
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		},
		[editorHeight],
	);

	/** Открывает Headers и заводит строку `Cookie`, если её ещё нет. */
	const editCookies = () => {
		setTab("Headers");
		setHeaders((list) =>
			list.some((h) => h.name.trim().toLowerCase() === "cookie")
				? list
				: [...list, { ...createHeaderDraft(), name: "Cookie" }],
		);
	};

	const draftLines = draft.split("\n");

	const shown = messages.filter((m) => {
		if (filter === "in" && m.kind !== "in") return false;
		if (filter === "out" && m.kind !== "out") return false;
		if (search.trim())
			return m.text.toLowerCase().includes(search.toLowerCase());
		return true;
	});
	// newest first, like the reference
	const ordered = [...shown].reverse();

	return (
		<div className={s.console}>
			{/* ─── CONNECT BAR ─── */}
			<div className={s.connectBar}>
				<span className={s.schemeTag}>WS</span>
				<input
					className={s.urlInput}
					placeholder="ws://localhost:8080/ws"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
				/>
				<button
					className={`${s.connectBtn}${connected ? " " + s.disconnect : ""}`}
					onClick={toggleConnection}
					disabled={connecting}
				>
					{connecting ? "Connecting…" : connected ? "Disconnect" : "Connect"}
				</button>
			</div>

			{/* ─── EDITOR SECTION ─── */}
			<div className={s.editorSection} style={{ height: editorHeight }}>
				<div className={s.tabsBar}>
					{TABS.map((t) => (
						<button
							key={t}
							className={`${s.tab}${tab === t ? " " + s.active : ""}`}
							onClick={() => setTab(t)}
						>
							{t}
						</button>
					))}
					<div className={s.tabsSpacer} />
					<button
						type="button"
						className={s.cookiesLink}
						onClick={editCookies}
						title="Заголовок Cookie для рукопожатия"
					>
						Cookies
					</button>
				</div>

				{tab === "Headers" ? (
					<div className={s.headersPane}>
						<HeadersEditor headers={headers} onChange={setHeaders} />
						<p className={s.headersHint}>
							Отправляются при подключении. Если не задать Authorization/Cookie,
							токен выбранного окружения подставится сам — способ настраивается
							в окружении.
						</p>
					</div>
				) : (
					<div className={s.editor}>
						<div className={s.gutter}>
							{draftLines.map((_, i) => (
								<div className={s.gutterLine} key={i}>
									{i + 1}
								</div>
							))}
						</div>
						<textarea
							className={s.codeArea}
							value={draft}
							onChange={(e) => onDraftChange(e.target.value)}
							onKeyDown={onKey}
							spellCheck={false}
							placeholder='{ "op": "subscribe", "streams": "…" }'
						/>
					</div>
				)}

				<div className={s.editorFooter}>
					<select className={s.formatSelect} defaultValue="JSON">
						<option>JSON</option>
						<option>Raw</option>
					</select>
					<button className={s.iconBtn} title="Clear">
						<svg
							width="14"
							height="14"
							viewBox="0 0 14 14"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.3"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M2 3.5h10M4.5 3.5V2.5h5v1M5 6v4M7 6v4M9 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8" />
						</svg>
					</button>
					<div className={s.footerSpacer} />
					<button
						className={s.sendBtn}
						onClick={send}
						disabled={!connected || !draft.trim()}
					>
						Send
					</button>
				</div>
			</div>

			<div className={s.vResize} onMouseDown={startVResize} />

			{/* ─── RESPONSE SECTION ─── */}
			<div className={s.responseSection}>
				<div className={s.responseHeader}>
					<span className={s.responseTitle}>Response</span>
					<span
						className={`${s.statusPill} ${connected ? s.online : s.offline}`}
					>
						{connected ? "Connected" : "Disconnected"}
					</span>
					<button className={s.headerDots} title="More">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
							<circle cx="3" cy="8" r="1.4" />
							<circle cx="8" cy="8" r="1.4" />
							<circle cx="13" cy="8" r="1.4" />
						</svg>
					</button>
				</div>

				<div className={s.toolbar}>
					<div className={s.searchWrap}>
						<svg
							width="13"
							height="13"
							viewBox="0 0 13 13"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.4"
							strokeLinecap="round"
						>
							<circle cx="5.5" cy="5.5" r="3.8" />
							<path d="M8.5 8.5L11 11" />
						</svg>
						<input
							className={s.searchInput}
							placeholder="Search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<select
						className={s.filterSelect}
						value={filter}
						onChange={(e) => setFilter(e.target.value as "all" | "in" | "out")}
					>
						<option value="all">All Messages</option>
						<option value="in">Received</option>
						<option value="out">Sent</option>
					</select>
					<button className={s.clearBtn} onClick={() => setMessages([])}>
						<svg
							width="12"
							height="12"
							viewBox="0 0 14 14"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.3"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M2 3.5h10M4.5 3.5V2.5h5v1M5 6v4M7 6v4M9 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8" />
						</svg>
						Clear Messages
					</button>
				</div>

				<div className={s.log}>
					{ordered.length === 0 && (
						<div className={s.emptyLog}>
							{connected
								? "Connected — send a message to get started."
								: "Not connected. Enter a URL and press Connect."}
						</div>
					)}
					{ordered.map((m) => (
						<LogRow key={m.id} msg={m} />
					))}
				</div>
			</div>
		</div>
	);
};
