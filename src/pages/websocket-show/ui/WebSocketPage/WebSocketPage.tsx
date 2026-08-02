import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
	type ChangeEvent,
	type FC,
	type KeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useLocation } from "react-router";
import { toast } from "@/core/toast";
import {
	type ImportWebsocketMessagesPayload,
	useWebsocketMessages,
	type WebsocketMessage,
} from "@/entities/websocket";
import {
	createHeaderDraft,
	type HeaderDraft,
	HeadersEditor,
} from "@/shared/ui-kit/controls";
import { Header } from "@/widgets/header";
import { CreateWebsocketMessageModal } from "../CreateWebsocketMessageModal";
import { EditWebsocketMessageModal } from "../EditWebsocketMessageModal";
import s from "./WebSocketPage.module.css";

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

const DEFAULT_DRAFT = `{ "op": "subscribe", "id": "init", "streams": "kline.exchange.symbol.interval" }`;

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
const ArrowUp: FC = () => (
	<svg
		width="13"
		height="13"
		viewBox="0 0 13 13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.6"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M6.5 10.5v-8M3 6l3.5-3.5L10 6" />
	</svg>
);

const ArrowDown: FC = () => (
	<svg
		width="13"
		height="13"
		viewBox="0 0 13 13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.6"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M6.5 2.5v8M3 7l3.5 3.5L10 7" />
	</svg>
);

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
					{msg.kind === "out" ? <ArrowUp /> : <ArrowDown />}
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

/* ─── PAGE ───────────────────────────────────── */
export const WebSocketPage: FC = () => {
	// A card on the service page links here with the socket's id and URL in
	// router state. The id ties this page to its saved example messages; it is
	// absent when the page is opened straight from the top nav.
	const location = useLocation();
	const navState = location.state as { id?: string; url?: string } | null;
	const websocketId = navState?.id ?? "";
	const initialUrl = navState?.url ?? "ws://localhost:8080/ws";
	const [url, setUrl] = useState(initialUrl);
	const [connId, setConnId] = useState<string | null>(null);
	const [connecting, setConnecting] = useState(false);
	const [tab, setTab] = useState<Tab>("Message");
	const [draft, setDraft] = useState(DEFAULT_DRAFT);
	/* Заголовки рукопожатия. Живут только на время сессии страницы; токен
	   окружения бэкенд подставляет сам, если своего `Authorization`/`Cookie`
	   здесь нет. */
	const [headers, setHeaders] = useState<HeaderDraft[]>([]);
	const [messages, setMessages] = useState<WsMessage[]>([]);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<"all" | "in" | "out">("all");
	const [editorHeight, setEditorHeight] = useState(300);

	/* Saved example frames, loaded from `websocket_message` for this socket. */
	const {
		messages: examples,
		isMessagesLoading,
		createMessageAsync,
		isCreatingMessage,
		updateMessageAsync,
		isUpdatingMessage,
		deleteMessageAsync,
		isDeletingMessage,
		importMessagesAsync,
		isImportingMessages,
	} = useWebsocketMessages(websocketId);
	const importInputRef = useRef<HTMLInputElement>(null);

	// `undefined` = modal closed, `null` = creating, object = editing that row.
	const [editing, setEditing] = useState<WebsocketMessage | null | undefined>(
		undefined,
	);

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

	const applyExample = (payload: string) => setDraft(payload);

	/* Create (editing === null) or update (editing is a row) an example frame. */
	const submitMessage = async (data: {
		name: string;
		payload: string;
		desc: string;
	}) => {
		try {
			if (editing) {
				await updateMessageAsync({ id: editing.id, ...data });
			} else {
				await createMessageAsync({ websocket_id: websocketId, ...data });
			}
			setEditing(undefined);
		} catch {
			/* error toast handled by the mutation */
		}
	};

	const deleteMessage = async () => {
		if (!editing) return;
		try {
			await deleteMessageAsync(editing.id);
			setEditing(undefined);
		} catch {
			/* error toast handled by the mutation */
		}
	};

	/** Read a previously exported example-frames JSON and bulk-create its
	 *  messages for this socket. Same `{ version, websocket?, messages[] }`
	 *  shape produced by an eventual export. */
	const handleImportMessages = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		try {
			const payload = JSON.parse(
				await file.text(),
			) as ImportWebsocketMessagesPayload;
			if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
				throw new Error("Файл не содержит сообщений");
			}
			await importMessagesAsync(payload);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось импортировать сообщения",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	return (
		<div className={s.wrapper}>
			<Header section="websocket" activeLink="websocket" />

			<div className={s.body}>
				{/* ─── EXAMPLES SIDEBAR ─── */}
				<aside className={s.sidebar}>
					<div className={s.sidebarHead}>
						<span>Examples</span>
						{websocketId && (
							<div className={s.sidebarHeadActions}>
								<input
									ref={importInputRef}
									type="file"
									accept=".json,application/json"
									hidden
									onChange={handleImportMessages}
								/>
								<button
									className={s.addBtn}
									onClick={() => importInputRef.current?.click()}
									disabled={isImportingMessages}
									title="Импортировать сообщения"
								>
									<svg
										width="14"
										height="14"
										viewBox="0 0 14 14"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.6"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<title>Импортировать сообщения</title>
										<path d="M7 1.5v7M4.2 6.3L7 9l2.8-2.7M2 10.5v1a1 1 0 001 1h8a1 1 0 001-1v-1" />
									</svg>
								</button>
								<button
									className={s.addBtn}
									onClick={() => setEditing(null)}
									title="Добавить сообщение"
								>
									<svg
										width="14"
										height="14"
										viewBox="0 0 14 14"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.6"
										strokeLinecap="round"
									>
										<title>Добавить сообщение</title>
										<path d="M7 2.5v9M2.5 7h9" />
									</svg>
								</button>
							</div>
						)}
					</div>
					<div className={s.exampleList}>
						{!websocketId ? (
							<div className={s.emptyExamples}>
								Откройте WebSocket из карточки сервиса, чтобы хранить сообщения.
							</div>
						) : isMessagesLoading ? (
							<div className={s.emptyExamples}>Загрузка…</div>
						) : examples.length === 0 ? (
							<div className={s.emptyExamples}>
								Пока нет сохранённых сообщений. Нажмите «+», чтобы добавить.
							</div>
						) : (
							examples.map((ex) => (
								<div key={ex.id} className={s.exampleItem}>
									<button
										type="button"
										className={s.exampleMain}
										onClick={() => applyExample(ex.payload)}
										title={ex.desc || ex.payload}
									>
										<span className={s.exampleName}>{ex.name}</span>
										<span className={s.examplePreview}>{ex.payload}</span>
									</button>
									<button
										type="button"
										className={s.exampleEdit}
										onClick={() => setEditing(ex)}
										title="Редактировать"
									>
										<svg
											width="13"
											height="13"
											viewBox="0 0 14 14"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.4"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<title>Редактировать</title>
											<path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9z" />
										</svg>
									</button>
								</div>
							))
						)}
					</div>
				</aside>

				<div className={s.main}>
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
							{connecting
								? "Connecting…"
								: connected
									? "Disconnect"
									: "Connect"}
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
									Отправляются при подключении. Если не задать
									Authorization/Cookie, токен выбранного окружения подставится
									сам — способ настраивается в окружении.
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
									onChange={(e) => setDraft(e.target.value)}
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
								<svg
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="currentColor"
								>
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
								onChange={(e) =>
									setFilter(e.target.value as "all" | "in" | "out")
								}
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
			</div>

			<CreateWebsocketMessageModal
				open={editing === null}
				onOpenChange={(o) => !o && setEditing(undefined)}
				onSubmit={submitMessage}
				isSaving={isCreatingMessage}
			/>
			{editing && (
				<EditWebsocketMessageModal
					open
					onOpenChange={(o) => !o && setEditing(undefined)}
					message={editing}
					onSubmit={submitMessage}
					onDelete={deleteMessage}
					isSaving={isUpdatingMessage}
					isDeleting={isDeletingMessage}
				/>
			)}
		</div>
	);
};
