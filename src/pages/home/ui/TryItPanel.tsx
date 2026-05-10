import { useState, useEffect, type FC } from "react";
import type {
	ExplorerEndpoint,
	ExplorerApi,
	EnvKey,
	HttpMethod,
} from "../model/types";
import s from "./ApiExplorerPage.module.css";
import { selectSelectedEnvConfig, useDocaStore } from "@/features/doca";

const METHOD_CFG: Record<HttpMethod, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
};

function buildUrl(
	ep: ExplorerEndpoint,
	api: ExplorerApi,
	vals: Record<string, string>,
) {
	let path = ep.path;
	const qp: Record<string, string> = {};
	for (const p of ep.params) {
		const v = (vals[p.name] ?? "").trim();
		if (!v) continue;
		if (path.includes(`{${p.name}}`))
			path = path.replace(`{${p.name}}`, encodeURIComponent(v));
		else if (ep.method === "GET") qp[p.name] = v;
	}
	const qs = new URLSearchParams(qp).toString();
	return `/${api.version}${path}${qs ? "?" + qs : ""}`;
}

function buildBody(ep: ExplorerEndpoint, vals: Record<string, string>) {
	if (ep.method === "GET") return {};
	const b: Record<string, string> = {};
	for (const p of ep.params) {
		const v = (vals[p.name] ?? "").trim();
		if (v && !ep.path.includes(`{${p.name}}`)) b[p.name] = v;
	}
	return b;
}

const CopyBtn: FC<{ text: string }> = ({ text }) => {
	const [done, setDone] = useState(false);
	const go = () => {
		navigator.clipboard?.writeText(text).catch(() => {});
		setDone(true);
		setTimeout(() => setDone(false), 1400);
	};
	return (
		<button className={s.copyBtn} onClick={go}>
			<svg
				viewBox="0 0 10 10"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.4"
				width="10"
				height="10"
			>
				<rect x="3" y="3" width="6" height="6" rx="1" />
				<path
					d="M7 3V1.5a1 1 0 00-1-1H1.5a1 1 0 00-1 1V6a1 1 0 001 1H3"
					strokeLinecap="round"
				/>
			</svg>
			{done ? "Copied!" : "Copy"}
		</button>
	);
};

export interface TryItPanelProps {
	ep: ExplorerEndpoint;
	api: ExplorerApi;
	env: EnvKey;
	authToken: string;
	onTokenRequest: () => void;
}

interface RespState {
	ok?: boolean;
	status?: number;
	statusText?: string;
	dur: number;
	body?: string;
	error?: string;
}

export const TryItPanel: FC<TryItPanelProps> = ({
	ep,
	api,
	authToken,
	onTokenRequest,
}) => {
	const envCfg = useDocaStore(selectSelectedEnvConfig);
	const [vals, setVals] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [resp, setResp] = useState<RespState | null>(null);
	const mc = METHOD_CFG[ep.method];

	useEffect(() => {
		setVals({});
		setResp(null);
	}, [ep.id]);

	const url = buildUrl(ep, api, vals);

	const send = async () => {
		setLoading(true);
		setResp(null);
		const headers: Record<string, string> = { Accept: "application/json" };
		if (ep.auth && authToken) headers["Authorization"] = `Bearer ${authToken}`;
		const body = buildBody(ep, vals);
		const hasBody = Object.keys(body).length > 0;
		if (hasBody) headers["Content-Type"] = "application/json";
		const opts: RequestInit = { method: ep.method, headers };
		if (hasBody) opts.body = JSON.stringify(body);
		const t0 = Date.now();
		try {
			const res = await fetch(url, opts);
			const dur = Date.now() - t0;
			const txt = await res.text();
			let bodyStr: string;
			try {
				bodyStr = JSON.stringify(JSON.parse(txt), null, 2);
			} catch {
				bodyStr = txt || "(empty)";
			}
			setResp({
				ok: res.ok,
				status: res.status,
				statusText: res.statusText,
				dur,
				body: bodyStr,
			});
		} catch (e) {
			setResp({ error: (e as Error).message, dur: Date.now() - t0 });
		}
		setLoading(false);
	};

	const sBg = (status: number) =>
		status < 300
			? "var(--green-bg)"
			: status < 500
				? "var(--amber-bg)"
				: "var(--red-bg)";
	const sClr = (status: number) =>
		status < 300
			? "var(--green)"
			: status < 500
				? "var(--amber)"
				: "var(--red)";

	if (!envCfg) return;

	return (
		<div className={s.tryPane}>
			<div className={s.tryHdr}>
				<span className={s.tryTitle}>Try it</span>
				<span className={s.tryEnvPill}>
					<span
						style={{
							width: 6,
							height: 6,
							borderRadius: "50%",
							display: "inline-block",
							flexShrink: 0,
						}}
					/>
					{envCfg.label}
				</span>
			</div>
			<div className={s.tryBody}>
				<div className={s.urlBar}>
					<div className={s.urlBarInner}>
						<span
							className={s.urlMethod}
							style={{ color: mc.color, background: mc.bg }}
						>
							{ep.method}
						</span>
						<span className={s.urlText} title={url}>
							{url}
						</span>
					</div>
				</div>

				{ep.auth && (
					<div className={`${s.authNotice}${authToken ? " " + s.ok : ""}`}>
						<span style={{ fontSize: 15 }}>{authToken ? "🔑" : "🔒"}</span>
						<span className={s.authNoticeTxt}>
							{authToken
								? "Authorized"
								: "This endpoint requires a Bearer token"}
						</span>
						{!authToken && (
							<button className={s.authNoticeBtn} onClick={onTokenRequest}>
								Set token
							</button>
						)}
					</div>
				)}

				{ep.params.length > 0 && (
					<div className={s.fieldsGroup}>
						<div className={s.fieldsLbl}>
							{ep.method === "GET" ? "Parameters" : "Request body"}
						</div>
						{ep.params.map((p) => (
							<div key={p.name} className={s.fieldRow}>
								<label className={s.fieldLabel}>
									<span className={s.fieldFname}>{p.name}</span>
									{p.req && <span className={s.fieldReq}>*</span>}
									<span className={s.fieldFtype}>{p.type}</span>
								</label>
								<input
									className={s.fieldInput}
									placeholder={p.def ? `default: ${p.def}` : p.desc}
									value={vals[p.name] ?? ""}
									onChange={(e) =>
										setVals((v) => ({ ...v, [p.name]: e.target.value }))
									}
								/>
							</div>
						))}
					</div>
				)}

				<button className={s.sendBtn} disabled={loading} onClick={send}>
					{loading ? (
						<>
							<span className={s.spin} />
							Sending…
						</>
					) : (
						`Send ${ep.method}`
					)}
				</button>

				{resp && (
					<div className={s.respCard}>
						<div className={s.respCardHdr}>
							{resp.error ? (
								<span
									className={s.respStatusBadge}
									style={{ background: "var(--red-bg)", color: "var(--red)" }}
								>
									Error
								</span>
							) : (
								<span
									className={s.respStatusBadge}
									style={{
										background: sBg(resp.status!),
										color: sClr(resp.status!),
									}}
								>
									{resp.status} {resp.statusText}
								</span>
							)}
							<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<span className={s.respDur}>{resp.dur}ms</span>
								{!resp.error && <CopyBtn text={resp.body!} />}
							</div>
						</div>
						{resp.error ? (
							<div className={s.respError}>Network error: {resp.error}</div>
						) : (
							<pre className={s.respPre}>{resp.body}</pre>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
