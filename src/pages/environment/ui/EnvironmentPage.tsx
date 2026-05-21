import { useState, useEffect, type FC } from "react";
import { invoke } from "@tauri-apps/api/core";
import s from "./EnvironmentPage.module.css";
import { Header } from "@/widgets/header";
import {
	selectSelectedEnvironment,
	actionUpdateEnvironment,
	actionAddVariableToEnv,
	actionUpdateVariableInEnv,
	actionDeleteVariableFromEnv,
	actionPatchEnvironmentAuth,
	actionPatchEnvironmentAccessToken,
	useDocStore,
} from "@/features/doc";
import {
	VariableModal,
	deleteVariable,
	updateEnvironment,
} from "@/entities/environment";
import type { Variable } from "@/entities/environment";
import { updateEnvironmentAuth, setEnvironmentAccessToken } from "@/entities/environment-auth";
import { getEnvDotColor } from "@/shared/lib/env-color";
import { toast } from "@/core/toast";
import { Sidebar } from "./Sidebar";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function extractByPath(obj: unknown, path: string): string | null {
	if (!path.trim()) return null;
	const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
	let cur: unknown = obj;
	for (const key of parts) {
		if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
			cur = (cur as Record<string, unknown>)[key];
		} else {
			return null;
		}
	}
	return typeof cur === "string" ? cur : cur != null ? String(cur) : null;
}

export const EnvironmentPage: FC = () => {
	const selectedEnv = useDocStore(selectSelectedEnvironment);
	const patchEnvironment = useDocStore(actionUpdateEnvironment);
	const addVariable = useDocStore(actionAddVariableToEnv);
	const updateVariable = useDocStore(actionUpdateVariableInEnv);
	const removeVariable = useDocStore(actionDeleteVariableFromEnv);
	const patchAuth = useDocStore(actionPatchEnvironmentAuth);
	const patchToken = useDocStore(actionPatchEnvironmentAccessToken);

	const [label, setLabel] = useState("");
	const [baseUrl, setBaseUrl] = useState("");
	const [prefix, setPrefix] = useState("");
	const [saving, setSaving] = useState(false);
	const [modal, setModal] = useState<"create" | Variable | null>(null);

	const [authUrl, setAuthUrl] = useState("");
	const [authMethod, setAuthMethod] = useState<string>("POST");
	const [authBody, setAuthBody] = useState("");
	const [authTokenPath, setAuthTokenPath] = useState("");
	const [savingAuth, setSavingAuth] = useState(false);
	const [fetchingToken, setFetchingToken] = useState(false);

	useEffect(() => {
		if (selectedEnv) {
			setLabel(selectedEnv.label);
			setBaseUrl(selectedEnv.baseUrl);
			setPrefix(selectedEnv.prefix);
			setAuthUrl(selectedEnv.auth.url);
			setAuthMethod(selectedEnv.auth.method || "POST");
			setAuthBody(selectedEnv.auth.body);
			setAuthTokenPath(selectedEnv.auth.tokenPath);
		}
	}, [selectedEnv?.id]);

	const isDirty =
		selectedEnv !== null &&
		(label !== selectedEnv.label ||
			baseUrl !== selectedEnv.baseUrl ||
			prefix !== selectedEnv.prefix);

	const handleSave = async () => {
		if (!selectedEnv) return;
		setSaving(true);
		try {
			await updateEnvironment({ id: selectedEnv.id, label, baseUrl, prefix });
			patchEnvironment({ id: selectedEnv.id, label, baseUrl, prefix });
			toast({ variant: "success", title: "Saved" });
		} catch {
			toast({ variant: "error", title: "Error", description: "Failed to save environment" });
		} finally {
			setSaving(false);
		}
	};

	const isAuthDirty =
		selectedEnv !== null &&
		(authUrl !== selectedEnv.auth.url ||
			authMethod !== (selectedEnv.auth.method || "POST") ||
			authBody !== selectedEnv.auth.body ||
			authTokenPath !== selectedEnv.auth.tokenPath);

	const handleSaveAuth = async () => {
		if (!selectedEnv) return;
		setSavingAuth(true);
		try {
			const dto = {
				environmentId: selectedEnv.id,
				url: authUrl.trim(),
				method: authMethod,
				body: authBody,
				tokenPath: authTokenPath.trim(),
			};
			await updateEnvironmentAuth(dto);
			patchAuth(dto);
			toast({ variant: "success", title: "Auth config saved" });
		} catch {
			toast({ variant: "error", title: "Error", description: "Failed to save auth config" });
		} finally {
			setSavingAuth(false);
		}
	};

	const handleFetchToken = async () => {
		if (!selectedEnv || !authUrl.trim()) return;
		setFetchingToken(true);
		try {
			const headers: Record<string, string> = { Accept: "application/json" };
			const trimmedBody = authBody.trim();
			const sendBody = authMethod === "GET" || !trimmedBody ? null : trimmedBody;
			if (sendBody !== null) headers["Content-Type"] = "application/json";

			const res = await invoke<{
				status: number;
				status_text: string;
				body: string;
				duration_ms: number;
			}>("send_request", {
				payload: { method: authMethod, url: authUrl.trim(), headers, body: sendBody },
			});

			if (res.status >= 300) {
				toast({
					variant: "error",
					title: `Auth request failed (${res.status})`,
					description: res.status_text,
				});
				return;
			}

			let parsed: unknown;
			try {
				parsed = JSON.parse(res.body);
			} catch {
				toast({
					variant: "error",
					title: "Invalid response",
					description: "Response body is not valid JSON",
				});
				return;
			}

			const token = extractByPath(parsed, authTokenPath);
			if (!token) {
				toast({
					variant: "error",
					title: "Token not found",
					description: `No value at path "${authTokenPath}"`,
				});
				return;
			}

			await setEnvironmentAccessToken(selectedEnv.id, token);
			patchToken(selectedEnv.id, token);
			toast({ variant: "success", title: "Token fetched" });
		} catch (e) {
			toast({
				variant: "error",
				title: "Error",
				description: String(e),
			});
		} finally {
			setFetchingToken(false);
		}
	};

	const handleClearToken = async () => {
		if (!selectedEnv) return;
		try {
			await setEnvironmentAccessToken(selectedEnv.id, null);
			patchToken(selectedEnv.id, null);
		} catch {
			toast({ variant: "error", title: "Error", description: "Failed to clear token" });
		}
	};

	const handleDelete = async (variable: Variable) => {
		try {
			await deleteVariable(variable.id);
			removeVariable(variable.id);
		} catch {
			toast({ variant: "error", title: "Error", description: "Failed to delete variable" });
		}
	};

	return (
		<div className={s.wrapper}>
			<Header section="environments" activeLink="environments" />

			<div className={s.shell}>
				<Sidebar />

				{/* Content */}
				<main className={s.main}>
					{selectedEnv ? (
						<>
							{/* Environment header */}
							<div className={s.envHeader}>
								<div className={s.envTitle}>
									<span
										className={s.envTitleDot}
										style={{ background: getEnvDotColor(selectedEnv.env) }}
									/>
									{label || selectedEnv.label}
								</div>
								<span className={s.envTitleTag}>{selectedEnv.env}</span>
							</div>

							{/* Editable fields */}
							<div className={s.fieldsCard}>
								<div className={s.fieldRow}>
									<label className={s.fieldLabel}>Label</label>
									<input
										className={s.fieldInput}
										value={label}
										onChange={(e) => setLabel(e.target.value)}
										placeholder="Production"
									/>
								</div>
								<div className={s.fieldDivider} />
								<div className={s.fieldRow}>
									<label className={s.fieldLabel}>Base URL</label>
									<input
										className={s.fieldInput}
										value={baseUrl}
										onChange={(e) => setBaseUrl(e.target.value)}
										placeholder="https://api.example.com"
									/>
								</div>
								<div className={s.fieldDivider} />
								<div className={s.fieldRow}>
									<label className={s.fieldLabel}>Prefix</label>
									<input
										className={s.fieldInput}
										value={prefix}
										onChange={(e) => setPrefix(e.target.value)}
										placeholder="/api/v1"
									/>
								</div>

								{isDirty && (
									<div className={s.saveBar}>
										<button
											className={s.saveBtn}
											onClick={handleSave}
											disabled={saving}
										>
											{saving ? "Saving…" : "Save changes"}
										</button>
										<button
											className={s.cancelBtn}
											onClick={() => {
												setLabel(selectedEnv.label);
												setBaseUrl(selectedEnv.baseUrl);
												setPrefix(selectedEnv.prefix);
											}}
										>
											Cancel
										</button>
									</div>
								)}
							</div>

							<div className={s.divider} />

							{/* Auth request */}
							<div className={s.section} style={{ marginBottom: 24 }}>
								<div className={s.sectionHdr}>
									<span className={s.sectionTitle}>Authorization request</span>
								</div>
								<div className={s.fieldsCard}>
									<div className={s.fieldRow}>
										<label className={s.fieldLabel}>Method</label>
										<select
											className={s.authMethodSelect}
											value={authMethod}
											onChange={(e) => setAuthMethod(e.target.value)}
										>
											{HTTP_METHODS.map((m) => (
												<option key={m} value={m}>
													{m}
												</option>
											))}
										</select>
									</div>
									<div className={s.fieldDivider} />
									<div className={s.fieldRow}>
										<label className={s.fieldLabel}>URL</label>
										<input
											className={s.fieldInput}
											value={authUrl}
											onChange={(e) => setAuthUrl(e.target.value)}
											placeholder="https://api.example.com/auth/login"
										/>
									</div>
									<div className={s.fieldDivider} />
									<div className={s.fieldRow}>
										<label className={s.fieldLabel}>Body</label>
										<textarea
											className={s.authTextarea}
											value={authBody}
											onChange={(e) => setAuthBody(e.target.value)}
											placeholder='{"email":"…","password":"…"}'
											disabled={authMethod === "GET"}
										/>
									</div>
									<div className={s.fieldDivider} />
									<div className={s.fieldRow}>
										<label className={s.fieldLabel}>Token path</label>
										<input
											className={s.fieldInput}
											value={authTokenPath}
											onChange={(e) => setAuthTokenPath(e.target.value)}
											placeholder="data.accessToken"
										/>
									</div>

									{isAuthDirty && (
										<div className={s.saveBar}>
											<button
												className={s.saveBtn}
												onClick={handleSaveAuth}
												disabled={savingAuth}
											>
												{savingAuth ? "Saving…" : "Save auth config"}
											</button>
											<button
												className={s.cancelBtn}
												onClick={() => {
													setAuthUrl(selectedEnv.auth.url);
													setAuthMethod(selectedEnv.auth.method || "POST");
													setAuthBody(selectedEnv.auth.body);
													setAuthTokenPath(selectedEnv.auth.tokenPath);
												}}
											>
												Cancel
											</button>
										</div>
									)}

									<div className={s.authActions}>
										<button
											className={s.authActionBtn}
											onClick={handleFetchToken}
											disabled={
												fetchingToken ||
												isAuthDirty ||
												!authUrl.trim() ||
												!authTokenPath.trim()
											}
											title={
												isAuthDirty
													? "Save auth config first"
													: !authUrl.trim() || !authTokenPath.trim()
														? "Fill URL and token path"
														: ""
											}
										>
											{fetchingToken ? "Fetching…" : "Fetch token"}
										</button>
										<span
											className={`${s.tokenStatus} ${selectedEnv.auth.accessToken ? s.tokenStatusOk : ""}`}
											title={selectedEnv.auth.accessToken ?? ""}
										>
											{selectedEnv.auth.accessToken
												? `Token: ${selectedEnv.auth.accessToken.slice(0, 24)}${selectedEnv.auth.accessToken.length > 24 ? "…" : ""}`
												: "No token yet"}
										</span>
										{selectedEnv.auth.accessToken && (
											<button className={s.authClearBtn} onClick={handleClearToken}>
												Clear
											</button>
										)}
									</div>
								</div>
							</div>

							<div className={s.divider} />

							{/* Variables */}
							<div className={s.section}>
								<div className={s.sectionHdr}>
									<span className={s.sectionTitle}>Variables</span>
									<button className={s.addBtn} onClick={() => setModal("create")}>
										+ Add variable
									</button>
								</div>

								{selectedEnv.value.length === 0 ? (
									<div className={s.empty}>
										No variables yet.{" "}
										<button className={s.emptyLink} onClick={() => setModal("create")}>
											Add one
										</button>
									</div>
								) : (
									<div className={s.table}>
										<div className={s.tableHead}>
											<span>Name</span>
											<span>Value</span>
											<span />
										</div>
										{selectedEnv.value.map((v) => (
											<div key={v.id} className={s.tableRow}>
												<code className={s.varName}>{v.name}</code>
												<code className={s.varValue}>
													{v.value || <span className={s.varEmpty}>empty</span>}
												</code>
												<div className={s.rowActions}>
													<button
														className={s.iconBtn}
														title="Edit"
														onClick={() => setModal(v)}
													>
														<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
															<path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" />
														</svg>
													</button>
													<button
														className={`${s.iconBtn} ${s.iconBtnDanger}`}
														title="Delete"
														onClick={() => handleDelete(v)}
													>
														<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="13" height="13">
															<path d="M2 3.5h10M5.5 3.5V2.5h3v1M5 3.5l.5 8M9 3.5l-.5 8" />
														</svg>
													</button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</>
					) : (
						<div className={s.placeholder}>Select an environment</div>
					)}
				</main>
			</div>

			{modal === "create" && selectedEnv && (
				<VariableModal
					environmentId={selectedEnv.id}
					onClose={() => setModal(null)}
					onSave={(v) => addVariable(selectedEnv.id, v)}
				/>
			)}
			{modal !== "create" && modal !== null && selectedEnv && (
				<VariableModal
					environmentId={selectedEnv.id}
					variable={modal}
					onClose={() => setModal(null)}
					onSave={(v) => updateVariable(v)}
				/>
			)}
		</div>
	);
};
