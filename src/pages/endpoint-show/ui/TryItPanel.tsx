import { invoke } from "@tauri-apps/api/core";
import { type FC, useEffect, useRef, useState } from "react";
import type { Endpoint, HttpMethod } from "@/entities/endpoint";
import {
	createEndpointRequestApi,
	deleteEndpointRequestApi,
	type EndpointRequest,
	listEndpointRequestsApi,
	type ParamKind,
	renameEndpointRequestApi,
	setRequestParamValueApi,
} from "@/entities/endpoint-request";
import type { Environment } from "@/entities/environment";
import { getEnvironmentAccessTokenApi } from "@/entities/environment-auth/api";
import {
	actionUpdateEndpointParamValue,
	// selectDoc,
	selectSelectedEndpoint,
	useDocStore,
} from "@/features/doc";
import {
	actionUpdateEnvironmentToken,
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { actionSetResponse, useResponseStore } from "@/features/request";
import { getEnvDotColor } from "@/shared/lib/env-color";
import s from "./ApiExplorerPage.module.css";

// Один именованный набор значений параметров запроса. Несколько наборов
// позволяют держать разные варианты одного и того же запроса и быстро
// переключаться между ними.
type ParamSet = {
	id: string;
	name: string;
	vals: Record<string, string>;
};

// Преобразует набор из бэка во внутреннее представление: значения индексируются
// ключом `${kind}:${name}`, как их ожидают поля формы и buildUrl/buildBody.
function reqToSet(req: EndpointRequest): ParamSet {
	const vals: Record<string, string> = {};
	for (const v of req.values) vals[`${v.kind}:${v.name}`] = v.value;
	return { id: req.id, name: req.name, vals };
}

// Разбирает ключ значения (`${kind}:${name}`) обратно на составляющие.
function splitValKey(key: string): { kind: ParamKind; name: string } {
	const idx = key.indexOf(":");
	return {
		kind: key.slice(0, idx) as ParamKind,
		name: key.slice(idx + 1),
	};
}

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

function buildUrl(
	ep: Endpoint,
	env: Environment,
	vals: Record<string, string> = {},
) {
	const path = ep.path.replace(/\{(\w+)\}/g, (_, name) => {
		const raw = (vals[`path:${name}`] ?? "").trim();
		const v = resolveEnvVars(raw, env);
		return v || `{${name}}`;
	});
	const qp: Record<string, string> = {};
	for (const p of ep.queryParams ?? []) {
		const raw = (
			vals[`query:${p.name}`] ?? (p.value ? `{{${p.value}}}` : "")
		).trim();
		const v = resolveEnvVars(raw, env);
		if (v) qp[p.name] = v;
	}
	const qs = new URLSearchParams(qp).toString();
	return `${env.baseUrl}${env.prefix}${path}${qs ? "?" + qs : ""}`;
}

// Приводит строковое значение параметра к типу, заявленному в его схеме
// (integer/number → число, boolean → bool). При неудаче возвращает исходную
// строку, чтобы не терять данные.
function coerceParamValue(raw: string, type: string): unknown {
	switch (type.toLowerCase()) {
		case "integer":
		case "int":
		case "long":
		case "number":
		case "float":
		case "double": {
			const n = Number(raw);
			return raw.trim() !== "" && !Number.isNaN(n) ? n : raw;
		}
		case "boolean":
		case "bool": {
			const v = raw.trim().toLowerCase();
			if (v === "true" || v === "1") return true;
			if (v === "false" || v === "0") return false;
			return raw;
		}
		default:
			return raw;
	}
}

function buildBody(
	ep: Endpoint,
	env: Environment,
	vals: Record<string, string>,
): string | null {
	if (ep.method === "GET" || !ep.bodyParams?.length) return null;
	const b: Record<string, unknown> = {};
	for (const p of ep.bodyParams) {
		const raw = (
			vals[`body:${p.name}`] ?? (p.value ? `{{${p.value}}}` : "")
		).trim();
		const v = resolveEnvVars(raw, env);
		if (v) b[p.name] = coerceParamValue(v, p.type);
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
		<button className={s.copyBtn} onClick={go} type="button">
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

export const TryItPanel = () => {
	const endpoint = useDocStore(selectSelectedEndpoint);
	// const doc = useDocStore(selectDoc);
	const selectedEnvConfig = useEnvironmentsStore(selectSelectedEnvironment);
	const [authToken, setAuthToken] = useState("");
	const setAccessToken = useEnvironmentsStore(actionUpdateEnvironmentToken);
	const updateEndpointParamValue = useDocStore(actionUpdateEndpointParamValue);

	const [tokenInput, setTokenInput] = useState("");
	const [settingToken, setSettingToken] = useState(false);
	const [paramSets, setParamSets] = useState<ParamSet[]>([]);
	const [activeSetId, setActiveSetId] = useState<string | null>(null);
	const [editingSetId, setEditingSetId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [loading, setLoading] = useState(false);
	const setResp = useResponseStore(actionSetResponse);
	// Таймеры debounce-сохранения значений, по ключу `${setId}|${valKey}`.
	const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

	if (!endpoint) return;
	// if (!doc) return;

	const mc = METHOD_CFG[endpoint.method];
	const pathParams = extractPathParams(endpoint.path);

	// Загружаем сохранённые наборы при смене эндпоинта. Если их нет — создаём
	// дефолтный "Set 1", чтобы пользователю всегда было куда вводить значения.
	useEffect(() => {
		let active = true;
		setResp(null);
		setEditingSetId(null);
		(async () => {
			try {
				let list = await listEndpointRequestsApi(endpoint.id);
				if (list.length === 0) {
					list = [await createEndpointRequestApi(endpoint.id, "Set 1")];
				}
				if (!active) return;
				setParamSets(list.map(reqToSet));
				setActiveSetId(list[0].id);
			} catch (e) {
				console.error("[TryItPanel] failed to load param sets:", e);
				if (active) {
					setParamSets([]);
					setActiveSetId(null);
				}
			}
		})();
		return () => {
			active = false;
		};
	}, [endpoint.id]);

	// Текущий активный набор параметров и его значения. Все правки полей
	// применяются только к активному набору и сохраняются в БД с debounce.
	const activeSet =
		paramSets.find((set) => set.id === activeSetId) ?? paramSets[0] ?? null;
	const vals = activeSet?.vals ?? {};

	const persistValue = (setId: string, key: string, value: string) => {
		const timerKey = `${setId}|${key}`;
		clearTimeout(saveTimers.current[timerKey]);
		saveTimers.current[timerKey] = setTimeout(() => {
			const { kind, name } = splitValKey(key);
			setRequestParamValueApi(setId, kind, name, value).catch((e) =>
				console.error("[TryItPanel] failed to persist param value:", e),
			);
		}, 500);
	};

	const updateField = (key: string, value: string) => {
		if (!activeSet) return;
		setParamSets((sets) =>
			sets.map((set) =>
				set.id === activeSet.id
					? { ...set, vals: { ...set.vals, [key]: value } }
					: set,
			),
		);
		persistValue(activeSet.id, key, value);
	};

	const addSet = async (cloneFrom?: ParamSet | null) => {
		try {
			const name = cloneFrom
				? `${cloneFrom.name} copy`
				: `Set ${paramSets.length + 1}`;
			const created = await createEndpointRequestApi(endpoint.id, name);
			const vals = cloneFrom ? { ...cloneFrom.vals } : {};
			setParamSets((sets) => [...sets, { id: created.id, name, vals }]);
			setActiveSetId(created.id);
			for (const [key, value] of Object.entries(vals)) {
				if (!value) continue;
				const { kind, name: pname } = splitValKey(key);
				setRequestParamValueApi(created.id, kind, pname, value).catch((e) =>
					console.error("[TryItPanel] failed to persist cloned value:", e),
				);
			}
		} catch (e) {
			console.error("[TryItPanel] failed to create param set:", e);
		}
	};

	const removeSet = async (id: string) => {
		if (paramSets.length <= 1) return;
		try {
			await deleteEndpointRequestApi(id);
			const next = paramSets.filter((set) => set.id !== id);
			setParamSets(next);
			if (id === activeSetId) setActiveSetId(next[0]?.id ?? null);
		} catch (e) {
			console.error("[TryItPanel] failed to delete param set:", e);
		}
	};

	const commitRename = () => {
		const id = editingSetId;
		const name = editName.trim();
		setEditingSetId(null);
		if (!id || !name) return;
		setParamSets((sets) =>
			sets.map((set) => (set.id === id ? { ...set, name } : set)),
		);
		renameEndpointRequestApi(id, name).catch((e) =>
			console.error("[TryItPanel] failed to rename param set:", e),
		);
	};

	useEffect(() => {
		const envId = selectedEnvConfig?.id;
		if (!envId) {
			setAuthToken("");
			return;
		}
		let active = true;
		getEnvironmentAccessTokenApi(envId)
			.then((token) => {
				if (active) setAuthToken(token ?? "");
			})
			.catch((e) => {
				console.error("[TryItPanel] failed to load access token:", e);
				if (active) setAuthToken("");
			});
		return () => {
			active = false;
		};
	}, [selectedEnvConfig?.id]);

	if (!selectedEnvConfig) return;

	const url = buildUrl(endpoint, selectedEnvConfig, vals);

	const send = async () => {
		setLoading(true);
		setResp(null);

		const varRefRe = /^\{\{(\w+)\}\}$/;
		const persistVarRefs = async () => {
			const tasks: Promise<void>[] = [];
			for (const p of endpoint.queryParams ?? []) {
				if (p.value) continue;
				const m = (vals[`query:${p.name}`] ?? "").trim().match(varRefRe);
				if (m)
					tasks.push(
						updateEndpointParamValue(endpoint.id, "query", p.name, m[1]),
					);
			}
			for (const p of endpoint.bodyParams ?? []) {
				if (p.value) continue;
				const m = (vals[`body:${p.name}`] ?? "").trim().match(varRefRe);
				if (m)
					tasks.push(
						updateEndpointParamValue(endpoint.id, "body", p.name, m[1]),
					);
			}
			await Promise.all(tasks);
		};
		try {
			await persistVarRefs();
		} catch (e) {
			console.error("[TryItPanel] failed to persist param values:", e);
		}

		const headers: Record<string, string> = { Accept: "application/json" };
		// if (endpoint.auth && authToken)
		// 	headers["Authorization"] = `Bearer ${authToken}`;
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
				<div className={s.paramSets}>
					<div className={s.paramSetsTabs}>
						{paramSets.map((set) => {
							const active = set.id === activeSetId;
							return (
								<div
									key={set.id}
									className={`${s.paramSetTab}${active ? ` ${s.active}` : ""}`}
									onClick={() => setActiveSetId(set.id)}
									onDoubleClick={() => {
										setEditingSetId(set.id);
										setEditName(set.name);
									}}
									title="Double-click to rename"
								>
									{editingSetId === set.id ? (
										<input
											ref={(el) => el?.focus()}
											className={s.paramSetEdit}
											value={editName}
											onChange={(e) => setEditName(e.target.value)}
											onBlur={commitRename}
											onKeyDown={(e) => {
												if (e.key === "Enter") commitRename();
												if (e.key === "Escape") setEditingSetId(null);
											}}
											onClick={(e) => e.stopPropagation()}
										/>
									) : (
										<>
											<span className={s.paramSetName}>{set.name}</span>
											{paramSets.length > 1 && (
												<button
													type="button"
													className={s.paramSetClose}
													title="Delete set"
													onClick={(e) => {
														e.stopPropagation();
														removeSet(set.id);
													}}
												>
													×
												</button>
											)}
										</>
									)}
								</div>
							);
						})}
					</div>
					<div className={s.paramSetsActions}>
						<button
							type="button"
							className={s.paramSetAdd}
							title="Duplicate current set"
							onClick={() => addSet(activeSet)}
						>
							⧉
						</button>
						<button
							type="button"
							className={s.paramSetAdd}
							title="New empty set"
							onClick={() => addSet()}
						>
							+
						</button>
					</div>
				</div>

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
								type="button"
								className={s.authNoticeBtn}
								onClick={() => {
									setAccessToken(null);
									setAuthToken("");
									setSettingToken(false);
								}}
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
										setAuthToken(tokenInput.trim());
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
								<button className={s.authNoticeBtn} type="submit">
									Save
								</button>
								<button
									className={s.authNoticeBtn}
									type="button"
									onClick={() => {
										setSettingToken(false);
										setTokenInput("");
									}}
								>
									Cancel
								</button>
							</form>
						) : (
							<button
								type="button"
								className={s.authNoticeBtn}
								onClick={() => setSettingToken(true)}
							>
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
									onChange={(e) => updateField(`path:${name}`, e.target.value)}
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
									value={
										vals[`query:${p.name}`] ?? (p.value ? `{{${p.value}}}` : "")
									}
									onChange={(e) =>
										updateField(`query:${p.name}`, e.target.value)
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
									value={
										vals[`body:${p.name}`] ?? (p.value ? `{{${p.value}}}` : "")
									}
									onChange={(e) =>
										updateField(`body:${p.name}`, e.target.value)
									}
								/>
							</div>
						))}
					</div>
				)}

				<button
					className={s.sendBtn}
					disabled={loading}
					onClick={send}
					type="button"
				>
					{loading ? (
						<>
							<span className={s.spin} />
							Sending…
						</>
					) : (
						`Send ${endpoint.method}`
					)}
				</button>
			</div>
		</div>
	);
};
