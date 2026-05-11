import { useState, useEffect, type FC, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
	KVRow,
	HistoryItem,
	MockResponse,
	Tweaks,
	AuthType,
	BodyType,
	HttpMethod,
} from "../model/types";
import {
	METHOD_CFG,
	INITIAL_HISTORY,
	COLLECTIONS,
} from "../data/httpClientData";
import s from "./HttpClientPage.module.css";
import { Header } from "@/widgets/header";

/* ─── HELPERS ────────────────────────────────── */
function syntaxHighlight(obj: unknown): string {
	const json = JSON.stringify(obj, null, 2);
	return json
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(
			/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
			(match) => {
				let color = "#9A2800";
				if (/^"/.test(match)) {
					color = /:$/.test(match) ? "#1A5EA8" : "#9A5F00";
				} else if (/true|false/.test(match)) {
					color = "#1E7E52";
				} else if (/null/.test(match)) {
					color = "#888";
				}
				return `<span style="color:${color}">${match}</span>`;
			},
		);
}

function statusStyle(code: number | undefined): { color: string; bg: string } {
	if (!code) return { color: "var(--ink-low)", bg: "var(--cat-bg)" };
	if (code < 300) return { color: "var(--green)", bg: "var(--green-bg)" };
	if (code < 400) return { color: "var(--blue)", bg: "var(--blue-bg)" };
	if (code < 500) return { color: "var(--amber)", bg: "var(--amber-bg)" };
	return { color: "var(--red)", bg: "var(--red-bg)" };
}

const STATUS_LABELS: Record<number, string> = {
	200: "OK",
	201: "Created",
	400: "Bad Request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "Not Found",
	422: "Unprocessable",
	429: "Too Many Requests",
	500: "Server Error",
};

/* ─── KV EDITOR ──────────────────────────────── */
interface KVEditorProps {
	rows: KVRow[];
	onChange: (rows: KVRow[]) => void;
}

const KVEditor: FC<KVEditorProps> = ({ rows, onChange }) => {
	const add = () =>
		onChange([...rows, { id: Date.now(), enabled: true, key: "", value: "" }]);
	const del = (id: number) => onChange(rows.filter((r) => r.id !== id));
	const upd = (id: number, field: keyof KVRow, val: string | boolean) =>
		onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

	return (
		<div className={s.kvTable}>
			<div className={s.kvHeader}>
				<span />
				<span>Key</span>
				<span>Value</span>
				<span />
			</div>
			{rows.map((row) => (
				<div className={s.kvRow} key={row.id}>
					<input
						type="checkbox"
						className={s.kvCheck}
						checked={row.enabled}
						onChange={(e) => upd(row.id, "enabled", e.target.checked)}
					/>
					<input
						className={s.kvInput}
						placeholder="key"
						value={row.key}
						onChange={(e) => upd(row.id, "key", e.target.value)}
					/>
					<input
						className={s.kvInput}
						placeholder="value"
						value={row.value}
						onChange={(e) => upd(row.id, "value", e.target.value)}
					/>
					<button className={s.kvDel} onClick={() => del(row.id)}>
						<svg
							viewBox="0 0 11 11"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						>
							<path d="M2 2l7 7M9 2l-7 7" />
						</svg>
					</button>
				</div>
			))}
			<button className={s.kvAdd} onClick={add}>
				<svg
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
				>
					<path d="M6 2v8M2 6h8" />
				</svg>
				Add row
			</button>
		</div>
	);
};

/* ─── REQUEST PANEL ──────────────────────────── */
interface RequestPanelProps {
	params: KVRow[];
	setParams: (r: KVRow[]) => void;
	headers: KVRow[];
	setHeaders: (r: KVRow[]) => void;
	body: string;
	setBody: (v: string) => void;
	bodyType: BodyType;
	setBodyType: (v: BodyType) => void;
	authType: AuthType;
	setAuthType: (v: AuthType) => void;
	authToken: string;
	setAuthToken: (v: string) => void;
	authUser: string;
	setAuthUser: (v: string) => void;
	authPass: string;
	setAuthPass: (v: string) => void;
}

const RequestPanel: FC<RequestPanelProps> = (props) => {
	const {
		params,
		setParams,
		headers,
		setHeaders,
		body,
		setBody,
		bodyType,
		setBodyType,
		authType,
		setAuthType,
		authToken,
		setAuthToken,
		authUser,
		setAuthUser,
		authPass,
		setAuthPass,
	} = props;
	const [tab, setTab] = useState<"params" | "headers" | "body" | "auth">(
		"params",
	);

	const paramCount = params.filter((p) => p.key && p.enabled).length;
	const headerCount = headers.filter((h) => h.key && h.enabled).length;

	const formatJSON = () => {
		try {
			setBody(JSON.stringify(JSON.parse(body), null, 2));
		} catch {
			/* invalid json — leave as-is */
		}
	};

	const TABS = [
		{ id: "params" as const, label: "Query Params", count: paramCount },
		{ id: "headers" as const, label: "Headers", count: headerCount },
		{ id: "body" as const, label: "Body" },
		{ id: "auth" as const, label: "Auth" },
	];

	return (
		<div className={s.reqPanel}>
			<div className={s.panelTabs}>
				{TABS.map((t) => (
					<button
						key={t.id}
						className={`${s.panelTab}${tab === t.id ? " " + s.active : ""}`}
						onClick={() => setTab(t.id)}
					>
						{t.label}
						{(t.count ?? 0) > 0 && (
							<span
								className={`${s.tabBadge}${tab === t.id ? " " + s.active : ""}`}
							>
								{t.count}
							</span>
						)}
					</button>
				))}
			</div>

			<div className={s.panelBody}>
				{tab === "params" && <KVEditor rows={params} onChange={setParams} />}

				{tab === "headers" && (
					<>
						<KVEditor rows={headers} onChange={setHeaders} />
						<div className={`${s.callout} ${s.info}`} style={{ marginTop: 12 }}>
							<svg className={s.calloutIcon} viewBox="0 0 14 14" fill="none">
								<circle
									cx="7"
									cy="7"
									r="5.5"
									stroke="#1A5EA8"
									strokeWidth="1.2"
								/>
								<path
									d="M7 6.5v3.5M7 5V5.5"
									stroke="#1A5EA8"
									strokeWidth="1.2"
									strokeLinecap="round"
								/>
							</svg>
							<span className={s.calloutText}>
								The <span className={s.ic}>Authorization</span> header is
								managed by the Auth tab and will be added automatically.
							</span>
						</div>
					</>
				)}

				{tab === "body" && (
					<>
						<div className={s.bodyToolbar}>
							<select
								className={s.bodyTypeSelect}
								value={bodyType}
								onChange={(e) => setBodyType(e.target.value as BodyType)}
							>
								<option value="json">JSON</option>
								<option value="form">Form Data</option>
								<option value="raw">Raw</option>
								<option value="none">None</option>
							</select>
							{bodyType === "json" && (
								<button className={s.bodyFormatBtn} onClick={formatJSON}>
									Format JSON
								</button>
							)}
						</div>
						{bodyType === "none" ? (
							<div
								style={{
									color: "var(--ink-low)",
									fontSize: 13,
									padding: "12px 4px",
								}}
							>
								No body for this request.
							</div>
						) : bodyType === "form" ? (
							<KVEditor rows={params} onChange={setParams} />
						) : (
							<textarea
								className={s.bodyTextarea}
								placeholder={
									bodyType === "json"
										? '{\n  "key": "value"\n}'
										: "Enter request body…"
								}
								value={body}
								onChange={(e) => setBody(e.target.value)}
								spellCheck={false}
							/>
						)}
					</>
				)}

				{tab === "auth" && (
					<div className={s.authGrid}>
						<div className={s.authTypeRow}>
							{(
								["None", "Bearer Token", "Basic Auth", "API Key"] as AuthType[]
							).map((t) => (
								<button
									key={t}
									className={`${s.authTypeBtn}${authType === t ? " " + s.active : ""}`}
									onClick={() => setAuthType(t)}
								>
									{t}
								</button>
							))}
						</div>

						{authType === "Bearer Token" && (
							<div className={s.authField}>
								<label className={s.authLabel}>Token</label>
								<input
									className={s.authInput}
									placeholder="eyJ0eXAiOiJKV1Qi..."
									value={authToken}
									onChange={(e) => setAuthToken(e.target.value)}
								/>
								<span className={s.authHint}>
									Will be sent as{" "}
									<span className={s.ic}>
										Authorization: Bearer {"{token}"}
									</span>
								</span>
							</div>
						)}

						{authType === "Basic Auth" && (
							<>
								<div className={s.authField}>
									<label className={s.authLabel}>Username</label>
									<input
										className={s.authInput}
										placeholder="username"
										value={authUser}
										onChange={(e) => setAuthUser(e.target.value)}
									/>
								</div>
								<div className={s.authField}>
									<label className={s.authLabel}>Password</label>
									<input
										className={s.authInput}
										type="password"
										placeholder="••••••••"
										value={authPass}
										onChange={(e) => setAuthPass(e.target.value)}
									/>
								</div>
								<span className={s.authHint}>
									Credentials will be Base64-encoded and sent as{" "}
									<span className={s.ic}>Authorization: Basic …</span>
								</span>
							</>
						)}

						{authType === "API Key" && (
							<>
								<div className={s.authField}>
									<label className={s.authLabel}>Key name</label>
									<input
										className={s.authInput}
										placeholder="X-API-Key"
										value={authUser}
										onChange={(e) => setAuthUser(e.target.value)}
									/>
								</div>
								<div className={s.authField}>
									<label className={s.authLabel}>Key value</label>
									<input
										className={s.authInput}
										placeholder="sk-…"
										value={authToken}
										onChange={(e) => setAuthToken(e.target.value)}
									/>
								</div>
							</>
						)}

						{authType === "None" && (
							<div className={`${s.callout} ${s.warn}`}>
								<svg className={s.calloutIcon} viewBox="0 0 14 14" fill="none">
									<path
										d="M7 1.5l5.5 10H1.5L7 1.5zm0 4v3m0 1.5v.5"
										stroke="#9A5F00"
										strokeWidth="1.2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<span className={s.calloutText}>
									No auth set. Requests to protected endpoints will return 401
									Unauthorized.
								</span>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

/* ─── RESPONSE PANEL ─────────────────────────── */
interface ResponsePanelProps {
	response: (MockResponse & { time: number }) | null;
	loading: boolean;
}

const ResponsePanel: FC<ResponsePanelProps> = ({ response, loading }) => {
	const [tab, setTab] = useState<"body" | "headers">("body");
	const [copied, setCopied] = useState(false);

	const copy = () => {
		if (!response) return;
		navigator.clipboard
			?.writeText(JSON.stringify(response.body, null, 2))
			.catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	const emptyBar = (
		<div
			style={{
				padding: "9px 16px",
				borderBottom: "1px solid var(--border)",
				background: "var(--bg)",
				height: 38,
			}}
		/>
	);

	if (loading) {
		return (
			<div className={s.resPanel}>
				{emptyBar}
				<div className={s.loadingState}>
					<div className={s.bigSpinner} />
					<div className={s.loadingText}>Sending request…</div>
				</div>
			</div>
		);
	}

	if (!response) {
		return (
			<div className={s.resPanel}>
				{emptyBar}
				<div className={s.emptyState}>
					<svg
						viewBox="0 0 44 44"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.3"
						strokeLinecap="round"
					>
						<rect x="6" y="8" width="32" height="28" rx="3" />
						<path d="M14 16h16M14 22h16M14 28h8" />
						<path d="M34 34l5 5" strokeWidth="2" />
						<circle cx="34" cy="34" r="5" />
					</svg>
					<div className={s.emptyTitle}>No response yet</div>
					<div className={s.emptySub}>
						Hit Send to make a request. The response will appear here.
					</div>
				</div>
			</div>
		);
	}

	const ss = statusStyle(response.status);
	const statusLabel = STATUS_LABELS[response.status] ?? "";

	return (
		<div className={s.resPanel}>
			<div className={s.resStatusBar}>
				<span
					className={s.resStatusCode}
					style={{ color: ss.color, background: ss.bg }}
				>
					{response.status} {statusLabel}
				</span>
				<div className={s.resMetaSep} />
				<div className={s.resMetaItem}>
					<svg
						viewBox="0 0 11 11"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.3"
						strokeLinecap="round"
					>
						<circle cx="5.5" cy="5.5" r="4.5" />
						<path d="M5.5 3v3l2 1.5" />
					</svg>
					{response.time} ms
				</div>
				<div className={s.resMetaSep} />
				<div className={s.resMetaItem}>
					<svg
						viewBox="0 0 11 11"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.3"
						strokeLinecap="round"
					>
						<rect x="1" y="1" width="9" height="9" rx="1.5" />
					</svg>
					{response.size}
				</div>
				<button className={s.resCopy} onClick={copy}>
					<svg
						viewBox="0 0 10 10"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.3"
					>
						<rect x="3" y="3" width="6" height="6" rx="1" />
						<path
							d="M7 3V1.5a1 1 0 00-1-1H1.5a1 1 0 00-1 1V6a1 1 0 001 1H3"
							strokeLinecap="round"
						/>
					</svg>
					{copied ? "Copied!" : "Copy"}
				</button>
			</div>

			<div className={s.resTabsBar}>
				{(["body", "headers"] as const).map((t) => (
					<button
						key={t}
						className={`${s.resTab}${tab === t ? " " + s.active : ""}`}
						onClick={() => setTab(t)}
					>
						{t === "body"
							? "Body"
							: `Headers (${Object.keys(response.headers ?? {}).length})`}
					</button>
				))}
			</div>

			<div className={s.resBody}>
				{tab === "body" && (
					<div
						className={s.jsonPre}
						dangerouslySetInnerHTML={{ __html: syntaxHighlight(response.body) }}
					/>
				)}
				{tab === "headers" && (
					<table className={s.headersTable}>
						<tbody>
							{Object.entries(response.headers ?? {}).map(([k, v]) => (
								<tr key={k}>
									<td className={s.hdrKey}>{k}</td>
									<td className={s.hdrVal}>{v}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
};

/* ─── SIDEBAR ────────────────────────────────── */
interface SidebarProps {
	history: HistoryItem[];
	activeId: number | null;
	onSelect: (item: HistoryItem) => void;
	onClear: () => void;
}

const Sidebar: FC<SidebarProps> = ({
	history,
	activeId,
	onSelect,
	onClear,
}) => {
	const [search, setSearch] = useState("");

	const today = history.filter((h) => h.ts.includes(":"));
	const older = history.filter((h) => !h.ts.includes(":"));

	const filter = (items: HistoryItem[]) =>
		search.trim()
			? items.filter(
					(h) =>
						h.url.toLowerCase().includes(search.toLowerCase()) ||
						h.name.toLowerCase().includes(search.toLowerCase()) ||
						h.method.toLowerCase().includes(search.toLowerCase()),
				)
			: items;

	const todayF = filter(today);
	const olderF = filter(older);

	const renderItem = (h: HistoryItem) => {
		const ms = METHOD_CFG[h.method] ?? {};
		const ss = statusStyle(h.status);
		return (
			<button
				key={h.id}
				className={`${s.historyItem}${activeId === h.id ? " " + s.active : ""}`}
				onClick={() => onSelect(h)}
			>
				<span
					className={s.historyMethod}
					style={{ color: ms.color, background: ms.bg }}
				>
					{h.method}
				</span>
				<div className={s.historyInfo}>
					<div className={s.historyName}>{h.name}</div>
					<div className={s.historyUrl}>
						{h.url.replace("https://api.example.com/v2", "")}
					</div>
				</div>
				<span
					className={s.historyStatus}
					style={{ color: ss.color, background: ss.bg }}
				>
					{h.status}
				</span>
			</button>
		);
	};

	return (
		<div className={s.sidebar}>
			<div className={s.sidebarHeader}>
				<span className={s.sidebarTitle}>History</span>
				<button className={s.sidebarClear} onClick={onClear}>
					Clear
				</button>
			</div>

			<div className={s.sidebarSearch}>
				<div className={s.sidebarSearchWrap}>
					<svg
						viewBox="0 0 12 12"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.3"
						strokeLinecap="round"
					>
						<circle cx="5" cy="5" r="3.5" />
						<path d="M8 8l2.5 2.5" />
					</svg>
					<input
						className={s.sidebarSearchInput}
						placeholder="Search history…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
			</div>

			<div className={s.historyScroll}>
				{todayF.length > 0 && (
					<>
						<div className={s.historyGroupLabel}>Today</div>
						{todayF.map(renderItem)}
					</>
				)}
				{olderF.length > 0 && (
					<>
						<div className={s.historyGroupLabel}>Earlier</div>
						{olderF.map(renderItem)}
					</>
				)}
				{todayF.length === 0 && olderF.length === 0 && (
					<div
						style={{
							padding: "24px 16px",
							textAlign: "center",
							color: "var(--ink-low)",
							fontSize: 12,
						}}
					>
						No results
					</div>
				)}
			</div>

			<div className={s.sidebarCollections}>
				<div className={s.sidebarCollectionsTitle}>Collections</div>
				{COLLECTIONS.map((c) => (
					<div className={s.collectionItem} key={c.name}>
						<div className={s.collectionDot} style={{ background: c.color }} />
						<span className={s.collectionName}>{c.name}</span>
						<span className={s.collectionCount}>{c.count}</span>
					</div>
				))}
			</div>
		</div>
	);
};

/* ─── TWEAKS PANEL ───────────────────────────── */
interface TweaksPanelProps {
	visible: boolean;
	onClose: () => void;
	tweaks: Tweaks;
	setTweak: <K extends keyof Tweaks>(key: K, val: Tweaks[K]) => void;
}

const TweaksPanel: FC<TweaksPanelProps> = ({
	visible,
	onClose,
	tweaks,
	setTweak,
}) => {
	if (!visible) return null;

	return (
		<div className={s.tweaksPanel}>
			<div className={s.tweaksHeader}>
				<span className={s.tweaksTitle}>Tweaks</span>
				<button className={s.tweaksClose} onClick={onClose}>
					<svg
						viewBox="0 0 11 11"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
					>
						<path d="M1.5 1.5l8 8M9.5 1.5l-8 8" />
					</svg>
				</button>
			</div>
			<div className={s.tweaksBody}>
				<div className={s.tweakRow}>
					<div className={s.tweakLabel}>Layout</div>
					<div className={s.tweakOptions}>
						{(["Horizontal", "Vertical"] as const).map((o) => (
							<button
								key={o}
								className={`${s.tweakOpt}${tweaks.layout === o ? " " + s.active : ""}`}
								onClick={() => setTweak("layout", o)}
							>
								{o}
							</button>
						))}
					</div>
				</div>
				<div className={s.tweakRow}>
					<div className={s.tweakToggleRow}>
						<span className={s.tweakToggleLbl}>Show sidebar</span>
						<button
							className={`${s.toggleSw}${tweaks.showSidebar ? " " + s.on : ""}`}
							onClick={() => setTweak("showSidebar", !tweaks.showSidebar)}
						/>
					</div>
				</div>
				<div className={s.tweakRow}>
					<div className={s.tweakToggleRow}>
						<span className={s.tweakToggleLbl}>Syntax highlight</span>
						<button
							className={`${s.toggleSw}${tweaks.highlight ? " " + s.on : ""}`}
							onClick={() => setTweak("highlight", !tweaks.highlight)}
						/>
					</div>
				</div>
				<div className={s.tweakRow}>
					<div className={s.tweakLabel}>Theme</div>
					<div className={s.tweakOptions}>
						{(["Light", "Dark"] as const).map((o) => (
							<button
								key={o}
								className={`${s.tweakOpt}${tweaks.theme === o ? " " + s.active : ""}`}
								onClick={() => setTweak("theme", o)}
							>
								{o}
							</button>
						))}
					</div>
				</div>
				<div className={s.tweakRow}>
					<div className={s.tweakLabel}>Font size</div>
					<div className={s.tweakOptions}>
						{(["Small", "Default", "Large"] as const).map((o) => (
							<button
								key={o}
								className={`${s.tweakOpt}${tweaks.fontSize === o ? " " + s.active : ""}`}
								onClick={() => setTweak("fontSize", o)}
							>
								{o}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

/* ─── PAGE ───────────────────────────────────── */
const TWEAK_DEFAULTS: Tweaks = {
	layout: "Horizontal",
	showSidebar: true,
	highlight: true,
	theme: "Light",
	fontSize: "Default",
};

export const HttpClientPage: FC = () => {
	const [method, setMethod] = useState<HttpMethod>("GET");
	const [url, setUrl] = useState("https://api.example.com/v2/users");
	const [params, setParams] = useState<KVRow[]>([
		{ id: 1, enabled: true, key: "page", value: "1" },
		{ id: 2, enabled: true, key: "per_page", value: "20" },
	]);
	const [headers, setHeaders] = useState<KVRow[]>([
		{ id: 1, enabled: true, key: "Accept", value: "application/json" },
	]);
	const [body, setBody] = useState('{\n  "name": "",\n  "email": ""\n}');
	const [bodyType, setBodyType] = useState<BodyType>("json");
	const [authType, setAuthType] = useState<AuthType>("Bearer Token");
	const [authToken, setAuthToken] = useState("");
	const [authUser, setAuthUser] = useState("");
	const [authPass, setAuthPass] = useState("");
	const [loading, setLoading] = useState(false);
	const [response, setResponse] = useState<
		(MockResponse & { time: number }) | null
	>(null);
	const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);
	const [activeHistId, setActiveHistId] = useState<number | null>(null);
	const [tweaksVisible, setTweaksVisible] = useState(false);
	const [tweaks, setTweaksState] = useState<Tweaks>(TWEAK_DEFAULTS);

	const setTweak = <K extends keyof Tweaks>(key: K, val: Tweaks[K]) => {
		setTweaksState((prev) => {
			const next = { ...prev, [key]: val };
			window.parent?.postMessage(
				{ type: "__edit_mode_set_keys", edits: next },
				"*",
			);
			return next;
		});
	};

	useEffect(() => {
		const handler = (e: MessageEvent) => {
			if (e.data?.type === "__activate_edit_mode") setTweaksVisible(true);
			if (e.data?.type === "__deactivate_edit_mode") setTweaksVisible(false);
		};
		window.addEventListener("message", handler);
		window.parent?.postMessage({ type: "__edit_mode_available" }, "*");
		return () => window.removeEventListener("message", handler);
	}, []);

	const fontSizePx =
		tweaks.fontSize === "Small"
			? "12px"
			: tweaks.fontSize === "Large"
				? "15px"
				: "14px";
	const ms = METHOD_CFG[method] ?? {};

	const send = async () => {
		if (!url.trim()) return;
		setLoading(true);
		setResponse(null);

		const qp = new URLSearchParams();
		for (const p of params) {
			if (p.enabled && p.key.trim()) qp.set(p.key.trim(), p.value);
		}
		const qs = qp.toString();
		const fullUrl = url.trim() + (qs ? (url.includes("?") ? "&" : "?") + qs : "");

		const headersMap: Record<string, string> = {};
		for (const h of headers) {
			if (h.enabled && h.key.trim()) headersMap[h.key.trim()] = h.value;
		}

		if (authType === "Bearer Token" && authToken)
			headersMap["Authorization"] = `Bearer ${authToken}`;
		else if (authType === "Basic Auth" && authUser)
			headersMap["Authorization"] = `Basic ${btoa(`${authUser}:${authPass}`)}`;
		else if (authType === "API Key" && authUser && authToken)
			headersMap[authUser] = authToken;

		let bodyStr: string | null = null;
		if (method !== "GET" && method !== "HEAD" && bodyType !== "none") {
			if (bodyType === "json" && body.trim()) {
				headersMap["Content-Type"] = "application/json";
				bodyStr = body;
			} else if (bodyType === "form") {
				const fd = new URLSearchParams();
				for (const p of params) {
					if (p.enabled && p.key.trim()) fd.set(p.key.trim(), p.value);
				}
				headersMap["Content-Type"] = "application/x-www-form-urlencoded";
				bodyStr = fd.toString();
			} else if (bodyType === "raw" && body.trim()) {
				bodyStr = body;
			}
		}

		try {
			const res = await invoke<{
				status: number;
				status_text: string;
				body: string;
				headers: Record<string, string>;
				duration_ms: number;
			}>("send_request", {
				payload: { method, url: fullUrl, headers: headersMap, body: bodyStr },
			});

			let parsedBody: unknown;
			try { parsedBody = JSON.parse(res.body); }
			catch { parsedBody = res.body; }

			const sizeBytes = new TextEncoder().encode(res.body).length;
			const sizeStr = sizeBytes < 1024
				? `${sizeBytes} B`
				: `${(sizeBytes / 1024).toFixed(1)} KB`;

			setResponse({ status: res.status, time: res.duration_ms, size: sizeStr, body: parsedBody, headers: res.headers });

			const now = new Date();
			const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
			const pathName = url.split("/").filter(Boolean).pop() ?? url;
			const newEntry: HistoryItem = {
				id: Date.now(),
				name: pathName.charAt(0).toUpperCase() + pathName.slice(1).replace(/\?.*/, ""),
				method,
				url,
				status: res.status,
				ts: timeStr,
			};
			setHistory((h) => [newEntry, ...h.slice(0, 19)]);
			setActiveHistId(newEntry.id);
		} catch (e) {
			setResponse({ status: 0, time: 0, size: "0 B", body: { error: String(e) }, headers: {} });
		} finally {
			setLoading(false);
		}
	};

	const loadHistory = (item: HistoryItem) => {
		setMethod(item.method);
		setUrl(item.url);
		setActiveHistId(item.id);
		setResponse(null);
	};

	const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
	};

	return (
		<div
			className={`${s.wrapper}${tweaks.theme === "Dark" ? " " + s.dark : ""}`}
			style={{ fontSize: fontSizePx }}
		>
			{/* NAV */}
			{/* <nav className={s.nav}>
				<div className={s.navBrand}>
					Lesser Known Laravel
					<div className={s.navSep} />
					<span className={s.navSection}>HTTP Client</span>
				</div>
				<div className={s.navLinks}>
					<a className={s.navLink} href="/docs">
						API Docs
					</a>
					<a className={`${s.navLink} ${s.active}`} href="/http-client">
						HTTP Client
					</a>
					<a className={s.navLink} href="/api-explorer">
						API Explorer
					</a>
					<button className={`${s.navLink} ${s.navLinkCta}`}>
						Get token →
					</button>
				</div>
			</nav> */}

			<Header section="docs1" activeLink="docs" />

			<div className={s.shell}>
				{tweaks.showSidebar && (
					<Sidebar
						history={history}
						activeId={activeHistId}
						onSelect={loadHistory}
						onClear={() => setHistory([])}
					/>
				)}

				<div className={s.main}>
					{/* URL BAR */}
					<div className={s.urlBar}>
						<div className={s.urlRow}>
							<div className={s.methodSelectWrap}>
								<select
									className={s.methodSelect}
									value={method}
									onChange={(e) => setMethod(e.target.value as HttpMethod)}
									style={{
										color: ms.color,
										borderColor:
											ms.bg === "var(--cat-bg)" ? "var(--border)" : ms.bg,
									}}
								>
									{(Object.keys(METHOD_CFG) as HttpMethod[]).map((m) => (
										<option key={m} value={m}>
											{m}
										</option>
									))}
								</select>
								<svg
									className={s.methodSelectChevron}
									viewBox="0 0 10 10"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
								>
									<path d="M2 4l3 3 3-3" />
								</svg>
							</div>

							<input
								className={s.urlInput}
								placeholder="https://api.example.com/v2/…"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								onKeyDown={handleKey}
							/>

							<button
								className={s.sendBtn}
								onClick={send}
								disabled={loading || !url.trim()}
							>
								{loading ? (
									<>
										<div className={s.btnSpinner} /> Sending
									</>
								) : (
									<>
										<svg
											width="12"
											height="12"
											viewBox="0 0 12 12"
											fill="currentColor"
										>
											<polygon points="2,1.5 11,6 2,10.5" />
										</svg>
										Send
									</>
								)}
							</button>
						</div>

						<div className={s.urlMeta}>
							<div className={s.urlMetaItem}>
								<svg
									viewBox="0 0 11 11"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.2"
									strokeLinecap="round"
								>
									<circle cx="5.5" cy="5.5" r="4.5" />
									<path d="M5.5 2v2M5.5 7v2M2 5.5h2M7 5.5h2" />
								</svg>
								<span className={s.ic} style={{ fontSize: 10 }}>
									api.example.com
								</span>
							</div>
							<div className={s.urlMetaItem}>
								<svg
									viewBox="0 0 11 11"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.2"
									strokeLinecap="round"
								>
									<rect x="2" y="5" width="7" height="5" rx="1" />
									<path d="M3.5 5V3.5a2 2 0 014 0V5" />
								</svg>
								HTTPS
							</div>
							<span
								className={s.urlMetaTag}
								style={{ background: "var(--green-bg)", color: "var(--green)" }}
							>
								v2
							</span>
							<div
								style={{
									marginLeft: "auto",
									fontSize: 11,
									color: "var(--ink-low)",
								}}
							>
								⌘ + Enter to send
							</div>
						</div>
					</div>

					{/* CONTENT SPLIT */}
					<div
						className={s.contentSplit}
						style={{
							flexDirection: tweaks.layout === "Vertical" ? "column" : "row",
						}}
					>
						<RequestPanel
							params={params}
							setParams={setParams}
							headers={headers}
							setHeaders={setHeaders}
							body={body}
							setBody={setBody}
							bodyType={bodyType}
							setBodyType={setBodyType}
							authType={authType}
							setAuthType={setAuthType}
							authToken={authToken}
							setAuthToken={setAuthToken}
							authUser={authUser}
							setAuthUser={setAuthUser}
							authPass={authPass}
							setAuthPass={setAuthPass}
						/>
						<ResponsePanel response={response} loading={loading} />
					</div>
				</div>
			</div>

			<TweaksPanel
				visible={tweaksVisible}
				onClose={() => {
					setTweaksVisible(false);
					window.parent?.postMessage({ type: "__edit_mode_dismissed" }, "*");
				}}
				tweaks={tweaks}
				setTweak={setTweak}
			/>
		</div>
	);
};
