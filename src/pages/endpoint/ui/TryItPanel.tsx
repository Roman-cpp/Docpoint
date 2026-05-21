import { useState, useEffect, type FC } from "react";
import { invoke } from "@tauri-apps/api/core";
import s from "./ApiExplorerPage.module.css";
import {
	selectDoc,
	selectSelectedEndpoint,
	selectSelectedEnvironment,
	selectAccessToken,
	actionSetAccessToken,
	useDocStore,
} from "@/features/doc";
import type { Endpoint, HttpMethod } from "@/entities/endpoint";
import type { Environment } from "@/entities/environment";
import { getEnvDotColor } from "@/shared/lib/env-color";

function resolveEnvVars(value: string, env: Environment): string {
	return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
		const found = env.value.find((v) => v.name === name);
		return found ? found.value : "";
	});
}

const METHOD_CFG: Record<HttpMethod, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
  HEAD: { color: "var(--delete)", bg: "var(--delete-bg)" },
};

function extractPathParams(path: string): string[] {
	return [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

function buildUrl(ep: Endpoint, env: Environment, vals: Record<string, string> = {}) {
	const path = ep.path.replace(/\{(\w+)\}/g, (_, name) => {
		const raw = (vals[`path:${name}`] ?? "").trim();
		const v = resolveEnvVars(raw, env);
		return v || `{${name}}`;
	});
	const qp: Record<string, string> = {};
	for (const p of ep.queryParams ?? []) {
		const raw = (vals[`query:${p.name}`] ?? (p.value ? `{{${p.value}}}` : "")).trim();
		const v = resolveEnvVars(raw, env);
		if (v) qp[p.name] = v;
	}
	const qs = new URLSearchParams(qp).toString();
	return `${env.baseUrl}${env.prefix}${path}${qs ? "?" + qs : ""}`;
}

function buildBody(ep: Endpoint, env: Environment, vals: Record<string, string>): string | null {
	if (ep.method === "GET" || !ep.bodyParams?.length) return null;
	const b: Record<string, string> = {};
	for (const p of ep.bodyParams) {
		const raw = (vals[`body:${p.name}`] ?? p.value ?? "").trim();
		const v = resolveEnvVars(raw, env);
		if (v) b[p.name] = v;
	}
	return Object.keys(b).length ? JSON.stringify(b) : null;
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

interface RespState {
	ok?: boolean;
	status?: number;
	statusText?: string;
	dur: number;
	body?: string;
	error?: string;
}

export const TryItPanel = () => {
	const endpoint = useDocStore(selectSelectedEndpoint);
	const doc = useDocStore(selectDoc);
	const selectedEnvConfig = useDocStore(selectSelectedEnvironment);
	const authToken = useDocStore(selectAccessToken) ?? "";
	const setAccessToken = useDocStore(actionSetAccessToken);

	const [tokenInput, setTokenInput] = useState("");
	const [settingToken, setSettingToken] = useState(false);
	const [vals, setVals] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [resp, setResp] = useState<RespState | null>(null);

	if (!endpoint) return;
	if (!doc) return;

	const mc = METHOD_CFG[endpoint.method];
	const pathParams = extractPathParams(endpoint.path);

	useEffect(() => {
		setVals({});
		setResp(null);
	}, [endpoint.id]);

	if (!selectedEnvConfig) return;

	const url = buildUrl(endpoint, selectedEnvConfig, vals);

	const send = async () => {
		setLoading(true);
		setResp(null);

		const headers: Record<string, string> = { Accept: "application/json" };
		if (endpoint.auth && authToken)
			headers["Authorization"] = `Bearer ${authToken}`;
		const body = buildBody(endpoint, selectedEnvConfig, vals);
		if (body !== null) headers["Content-Type"] = "application/json";

		try {
			const res = await invoke<{
				status: number;
				status_text: string;
				body: string;
				duration_ms: number;
			}>("send_request", {
				payload: { method: endpoint.method, url, headers, body },
			});

			let bodyStr: string;
			try {
				bodyStr = JSON.stringify(JSON.parse(res.body), null, 2);
			} catch {
				bodyStr = res.body || "(empty)";
			}

			setResp({
				ok: res.status < 300,
				status: res.status,
				statusText: res.status_text,
				dur: res.duration_ms,
				body: bodyStr,
			});
		} catch (e) {
			setResp({ error: String(e), dur: 0 });
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
							background: getEnvDotColor(selectedEnvConfig.env),
							display: "inline-block",
							flexShrink: 0,
						}}
					/>
					{selectedEnvConfig.label}
				</span>
			</div>
			<div className={s.tryBody}>
				<div className={s.urlBar}>
					<div className={s.urlBarInner}>
						<span
							className={s.urlMethod}
							style={{ color: mc.color, background: mc.bg }}
						>
							{endpoint.method}
						</span>
						<span className={s.urlText} title={url}>
							{url}
						</span>
						<CopyBtn text={url} />
					</div>
				</div>

				{endpoint.auth && (
					<div className={`${s.authNotice}${authToken ? " " + s.ok : ""}`}>
						<span style={{ fontSize: 15 }}>{authToken ? "🔑" : "🔒"}</span>
						<span className={s.authNoticeTxt}>
							{authToken
								? "Authorized"
								: "This endpoint requires a Bearer token"}
						</span>
						{authToken ? (
							<button
								className={s.authNoticeBtn}
								onClick={() => { setAccessToken(null); setSettingToken(false); }}
							>
								Clear
							</button>
						) : settingToken ? (
							<form
								style={{ display: "flex", gap: 4, flex: 1 }}
								onSubmit={(e) => {
									e.preventDefault();
									if (tokenInput.trim()) {
										setAccessToken(tokenInput.trim());
										setSettingToken(false);
										setTokenInput("");
									}
								}}
							>
								<input
									autoFocus
									className={s.fieldInput}
									style={{ flex: 1, padding: "3px 8px", fontSize: 12 }}
									placeholder="Bearer token…"
									value={tokenInput}
									onChange={(e) => setTokenInput(e.target.value)}
								/>
								<button className={s.authNoticeBtn} type="submit">Save</button>
								<button
									className={s.authNoticeBtn}
									type="button"
									onClick={() => { setSettingToken(false); setTokenInput(""); }}
								>
									Cancel
								</button>
							</form>
						) : (
							<button className={s.authNoticeBtn} onClick={() => setSettingToken(true)}>
								Set token
							</button>
						)}
					</div>
				)}

				{pathParams.length > 0 && (
					<div className={s.fieldsGroup}>
						<div className={s.fieldsLbl}>Path params</div>
						{pathParams.map((name) => (
							<div key={name} className={s.fieldRow}>
								<label className={s.fieldLabel}>
									<span className={s.fieldFname}>{name}</span>
									<span className={s.fieldReq}>*</span>
								</label>
								<input
									className={s.fieldInput}
									placeholder={name}
									value={vals[`path:${name}`] ?? ""}
									onChange={(e) =>
										setVals((v) => ({ ...v, [`path:${name}`]: e.target.value }))
									}
								/>
							</div>
						))}
					</div>
				)}

				{endpoint.queryParams?.length > 0 && (
					<div className={s.fieldsGroup}>
						<div className={s.fieldsLbl}>Query params</div>
						{endpoint.queryParams.map((p) => (
							<div key={p.name} className={s.fieldRow}>
								<label className={s.fieldLabel}>
									<span className={s.fieldFname}>{p.name}</span>
									{p.required && <span className={s.fieldReq}>*</span>}
									<span className={s.fieldFtype}>{p.type}</span>
								</label>
								<input
									className={s.fieldInput}
									placeholder={p.default ? `default: ${p.default}` : p.desc}
									readOnly={!!p.value}
									value={p.value ? `{{${p.value}}}` : (vals[`query:${p.name}`] ?? "")}
									onChange={(e) =>
										setVals((v) => ({ ...v, [`query:${p.name}`]: e.target.value }))
									}
								/>
							</div>
						))}
					</div>
				)}

				{endpoint.bodyParams?.length > 0 && endpoint.method !== "GET" && (
					<div className={s.fieldsGroup}>
						<div className={s.fieldsLbl}>Request body</div>
						{endpoint.bodyParams.map((p) => (
							<div key={p.name} className={s.fieldRow}>
								<label className={s.fieldLabel}>
									<span className={s.fieldFname}>{p.name}</span>
									{p.required && <span className={s.fieldReq}>*</span>}
									<span className={s.fieldFtype}>{p.type}</span>
								</label>
								<input
									className={s.fieldInput}
									placeholder={p.default ? `default: ${p.default}` : p.desc}
									readOnly={!!p.value}
									value={p.value ? `{{${p.value}}}` : (vals[`body:${p.name}`] ?? "")}
									onChange={(e) =>
										setVals((v) => ({ ...v, [`body:${p.name}`]: e.target.value }))
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
						`Send ${endpoint.method}`
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
