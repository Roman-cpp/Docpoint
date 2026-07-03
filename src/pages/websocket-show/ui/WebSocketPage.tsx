import {
	type FC,
	type KeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useState,
} from "react";
import { Header } from "@/widgets/header";
import s from "./WebSocketPage.module.css";

/* ─── TYPES ──────────────────────────────────── */
type Direction = "in" | "out";

interface WsMessage {
	id: number;
	dir: Direction;
	text: string;
	ts: string;
}

/* ─── MOCK DATA (template only) ──────────────── */
const OUTGOING = `{ "op": "unsubscribe", "id": "init", "streams": "kline.exchange.symbol.interval"}`;
const INCOMING = `{"channel":"","event":"error","data":"unknown action"}`;

const MOCK_MESSAGES: WsMessage[] = [
	{ id: 1, dir: "out", text: OUTGOING, ts: "15:12:05.759" },
	{ id: 2, dir: "in", text: INCOMING, ts: "15:12:05.765" },
	{ id: 3, dir: "out", text: OUTGOING, ts: "15:12:06.809" },
	{ id: 4, dir: "in", text: INCOMING, ts: "15:12:06.815" },
	{ id: 5, dir: "out", text: OUTGOING, ts: "15:12:07.287" },
	{ id: 6, dir: "in", text: INCOMING, ts: "15:12:07.293" },
];

const TABS = ["Message", "Params", "Headers", "Settings"] as const;
type Tab = (typeof TABS)[number];

const now = () => new Date().toTimeString().slice(0, 8) + ".000";

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

/* ─── LOG ROW ────────────────────────────────── */
const LogRow: FC<{ msg: WsMessage }> = ({ msg }) => {
	const [open, setOpen] = useState(false);
	const pretty = prettyJson(msg.text);
	const lines = pretty.split("\n");

	return (
		<div className={s.logRow}>
			<div className={s.logRowHead} onClick={() => setOpen((o) => !o)}>
				<span className={`${s.dirIcon} ${msg.dir === "out" ? s.out : s.in}`}>
					{msg.dir === "out" ? <ArrowUp /> : <ArrowDown />}
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
	const [url, setUrl] = useState("http://localhost:8080/ws");
	const [connected, setConnected] = useState(true);
	const [tab, setTab] = useState<Tab>("Message");
	const [draft, setDraft] = useState(OUTGOING);
	const [messages, setMessages] = useState<WsMessage[]>(MOCK_MESSAGES);
	const [search, setSearch] = useState("");
	const [editorHeight, setEditorHeight] = useState(300);

	/* NOTE: template only — no real WebSocket connection yet */
	const toggleConnection = () => setConnected((c) => !c);

	const send = () => {
		if (!draft.trim() || !connected) return;
		setMessages((m) => [
			...m,
			{ id: Date.now(), dir: "out", text: draft.trim(), ts: now() },
		]);
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

	const draftLines = draft.split("\n");

	const shown =
		messages.filter((m) =>
			search.trim() ? m.text.toLowerCase().includes(search.toLowerCase()) : true,
		) ?? [];
	// newest first, like the reference
	const ordered = [...shown].reverse();

	return (
		<div className={s.wrapper}>
			<Header section="websocket" activeLink="websocket" />

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
					>
						{connected ? "Disconnect" : "Connect"}
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
						<span className={s.cookiesLink}>Cookies</span>
					</div>

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
						<select className={s.filterSelect} defaultValue="all">
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
						{ordered.map((m) => (
							<LogRow key={m.id} msg={m} />
						))}

						{connected && (
							<div className={s.systemRow}>
								<span className={s.systemIcon}>
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
								</span>
								<span className={s.systemText}>Connected to {url}</span>
								<span className={s.logTime}>15:10:35.265</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
