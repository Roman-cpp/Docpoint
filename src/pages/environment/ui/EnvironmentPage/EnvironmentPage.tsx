import { invoke } from "@tauri-apps/api/core";
import { type FC, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import type { Variable } from "@/entities/environment";
import {
	DeleteVariableModal,
	deleteEnvironmentApi,
	duplicateEnvironmentApi,
	updateEnvironmentApi,
	VariableModal,
} from "@/entities/environment";
import {
	readEnvironmentAuthApi,
	setEnvironmentAccessTokenApi,
	updateEnvironmentAuthApi,
} from "@/entities/environment-auth";
import {
	actionAddEnvironment,
	actionaddVariableToEnvironment,
	actionDeleteEnvironment,
	actiondeleteVariableFromEnvironment,
	actionUpdateEnvironment,
	actionUpdateEnvironmentToken,
	actionupdateVariableInEnvironment,
	selectSelectedEnvironment,
	useEnvironmentsStore,
} from "@/features/environment";
import { getEnvDotColor } from "@/shared/lib/env-color";
import { Dialog } from "@/shared/ui-kit/modal";
import { Header } from "../../../../widgets/header/ui/Header/Header";
import { AuthRequestSection } from "../AuthRequestSection";
import { EndpointSection } from "../EndpointSection";
import s from "../EnvironmentPage.module.css";
import { IdentificationSection } from "../IdentificationSection";
import {
	type AuthMethod,
	BoltIcon,
	CopyIcon,
	HTTP_METHODS,
	TrashIcon,
} from "../parts";
import { Sidebar } from "../Sidebar";
import { VariablesSection } from "../VariablesSection";

function extractByPath(obj: unknown, path: string): string | null {
	if (!path.trim()) return null;
	const parts = path
		.split(".")
		.map((p) => p.trim())
		.filter(Boolean);
	let cur: unknown = obj;
	for (const key of parts) {
		if (
			cur &&
			typeof cur === "object" &&
			key in (cur as Record<string, unknown>)
		) {
			cur = (cur as Record<string, unknown>)[key];
		} else {
			return null;
		}
	}
	return typeof cur === "string" ? cur : cur != null ? String(cur) : null;
}

const asMethod = (value: string): AuthMethod => {
	const upper = value.toUpperCase();
	return (HTTP_METHODS as readonly string[]).includes(upper)
		? (upper as AuthMethod)
		: "POST";
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export const EnvironmentPage: FC = () => {
	const selectedEnv = useEnvironmentsStore(selectSelectedEnvironment);
	const patchEnvironment = useEnvironmentsStore(actionUpdateEnvironment);
	const removeEnvironment = useEnvironmentsStore(actionDeleteEnvironment);
	const addEnvironment = useEnvironmentsStore(actionAddEnvironment);
	const addVariable = useEnvironmentsStore(actionaddVariableToEnvironment);
	const updateVariableInStore = useEnvironmentsStore(
		actionupdateVariableInEnvironment,
	);
	const removeVariable = useEnvironmentsStore(
		actiondeleteVariableFromEnvironment,
	);
	const patchToken = useEnvironmentsStore(actionUpdateEnvironmentToken);

	// Environment basics
	const [label, setLabel] = useState("");
	const [baseUrl, setBaseUrl] = useState("");
	const [prefix, setPrefix] = useState("");
	const [envStatus, setEnvStatus] = useState<SaveStatus>("idle");
	const [duplicating, setDuplicating] = useState(false);
	const [confirmDeleteEnv, setConfirmDeleteEnv] = useState(false);
	const [deletingEnv, setDeletingEnv] = useState(false);

	// Auth config
	const [authUrl, setAuthUrl] = useState("");
	const [authMethod, setAuthMethod] = useState<AuthMethod>("POST");
	const [authBody, setAuthBody] = useState("");
	const [authTokenPath, setAuthTokenPath] = useState("");
	const [authStatus, setAuthStatus] = useState<SaveStatus>("idle");
	const [fetchingToken, setFetchingToken] = useState(false);
	const loadedAuthRef = useRef<{
		url: string;
		method: AuthMethod;
		body: string;
		tokenPath: string;
	} | null>(null);

	// Variable modal
	const [modal, setModal] = useState<"create" | Variable | null>(null);
	const [variableToDelete, setVariableToDelete] = useState<Variable | null>(
		null,
	);

	const envSnapshotRef = useRef(selectedEnv);
	envSnapshotRef.current = selectedEnv;
	const envId = selectedEnv?.id ?? null;

	useEffect(() => {
		if (!envId) {
			loadedAuthRef.current = null;
			return;
		}
		const env = envSnapshotRef.current;
		if (!env || env.id !== envId) return;
		setLabel(env.label);
		setBaseUrl(env.baseUrl);
		setPrefix(env.prefix);
		setEnvStatus("idle");

		let cancelled = false;
		readEnvironmentAuthApi(envId).then((auth) => {
			if (cancelled) return;
			const method = asMethod(auth.method || "POST");
			setAuthUrl(auth.url);
			setAuthMethod(method);
			setAuthBody(auth.body);
			setAuthTokenPath(auth.tokenPath);
			setAuthStatus("idle");
			loadedAuthRef.current = {
				url: auth.url,
				method,
				body: auth.body,
				tokenPath: auth.tokenPath,
			};
		});
		return () => {
			cancelled = true;
		};
	}, [envId]);

	const saveEnvironment = async (overrides?: {
		label?: string;
		baseUrl?: string;
		prefix?: string;
	}) => {
		if (!selectedEnv) return;
		const next = {
			label: overrides?.label ?? label,
			baseUrl: overrides?.baseUrl ?? baseUrl,
			prefix: overrides?.prefix ?? prefix,
		};
		if (
			next.label === selectedEnv.label &&
			next.baseUrl === selectedEnv.baseUrl &&
			next.prefix === selectedEnv.prefix
		) {
			return;
		}
		setEnvStatus("saving");
		try {
			const dto = { id: selectedEnv.id, ...next };
			await updateEnvironmentApi(dto);
			patchEnvironment(dto);
			setEnvStatus("saved");
			setTimeout(
				() => setEnvStatus((status) => (status === "saved" ? "idle" : status)),
				1500,
			);
		} catch {
			setEnvStatus("error");
			toast({
				variant: "error",
				title: "Error",
				description: "Failed to save environment",
			});
		}
	};

	const saveAuth = async (overrides?: {
		url?: string;
		method?: AuthMethod;
		body?: string;
		tokenPath?: string;
	}) => {
		if (!selectedEnv) return;
		const loaded = loadedAuthRef.current;
		const next = {
			url: (overrides?.url ?? authUrl).trim(),
			method: overrides?.method ?? authMethod,
			body: overrides?.body ?? authBody,
			tokenPath: (overrides?.tokenPath ?? authTokenPath).trim(),
		};
		if (
			loaded &&
			next.url === loaded.url &&
			next.method === loaded.method &&
			next.body === loaded.body &&
			next.tokenPath === loaded.tokenPath
		) {
			return;
		}
		setAuthStatus("saving");
		try {
			await updateEnvironmentAuthApi({
				environmentId: selectedEnv.id,
				...next,
			});
			patchToken(next.tokenPath);
			loadedAuthRef.current = next;
			setAuthStatus("saved");
			setTimeout(
				() => setAuthStatus((status) => (status === "saved" ? "idle" : status)),
				1500,
			);
		} catch {
			setAuthStatus("error");
			toast({
				variant: "error",
				title: "Error",
				description: "Failed to save auth config",
			});
		}
	};

	const handleFetchToken = async () => {
		if (!selectedEnv || !authUrl.trim()) return;
		// Make sure latest auth config is persisted before firing the request.
		await saveAuth();
		setFetchingToken(true);
		try {
			const headers: Record<string, string> = { Accept: "application/json" };
			const trimmedBody = authBody.trim();
			const sendBody =
				authMethod === "GET" || !trimmedBody ? null : trimmedBody;
			if (sendBody !== null) headers["Content-Type"] = "application/json";

			const res = await invoke<{
				status: number;
				status_text: string;
				body: string;
				duration_ms: number;
			}>("send_request", {
				payload: {
					method: authMethod,
					url: authUrl.trim(),
					headers,
					body: sendBody,
				},
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

			await setEnvironmentAccessTokenApi(selectedEnv.id, token);
			patchToken(token);
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
			await setEnvironmentAccessTokenApi(selectedEnv.id, null);
			patchToken(null);
		} catch {
			toast({
				variant: "error",
				title: "Error",
				description: "Failed to clear token",
			});
		}
	};

	const handleDeleteEnvironment = () => {
		if (!selectedEnv) return;
		setConfirmDeleteEnv(true);
	};

	const confirmDeleteEnvironment = async () => {
		if (!selectedEnv || deletingEnv) return;
		setDeletingEnv(true);
		try {
			await deleteEnvironmentApi(selectedEnv.id);
			removeEnvironment(selectedEnv.id);
			setConfirmDeleteEnv(false);
		} catch {
			toast({
				variant: "error",
				title: "Error",
				description: "Failed to delete environment",
			});
		} finally {
			setDeletingEnv(false);
		}
	};

	const handleDuplicateEnvironment = async () => {
		if (!selectedEnv) return;
		setDuplicating(true);
		try {
			const copy = await duplicateEnvironmentApi(selectedEnv.id);
			addEnvironment(copy);
			toast({ variant: "success", title: "Окружение скопировано" });
		} catch {
			toast({
				variant: "error",
				title: "Error",
				description: "Failed to duplicate environment",
			});
		} finally {
			setDuplicating(false);
		}
	};

	const handleDeleteVariable = (variable: Variable) => {
		setVariableToDelete(variable);
	};

	const statusHint = (status: SaveStatus) => {
		switch (status) {
			case "saving":
				return "сохраняем…";
			case "saved":
				return "сохранено";
			case "error":
				return "не сохранено";
			default:
				return "авто-сохранение";
		}
	};

	const renderHero = () => {
		if (!selectedEnv) return null;
		const accent = getEnvDotColor(selectedEnv.env);
		const finalUrl =
			`${baseUrl.replace(/\/+$/, "")}${prefix.startsWith("/") || !prefix ? prefix : `/${prefix}`}` ||
			"—";
		const tokenInfo = selectedEnv.accessToken
			? {
					variant: "ok" as const,
					label: `Токен · ${selectedEnv.accessToken.slice(0, 12)}${selectedEnv.accessToken.length > 12 ? "…" : ""}`,
				}
			: {
					variant: "warn" as const,
					label: "Токен не получен",
				};

		return (
			<div className={s.envHero}>
				<span className={s.envHeroMark} style={{ background: accent }} />
				<div className={s.envHeroText}>
					<h1 className={s.envHeroName}>
						{label || selectedEnv.label}
						<span className={s.envHeroNameTag}>{selectedEnv.env}</span>
					</h1>
					<div className={s.envHeroMeta}>
						<span>{finalUrl || "—"}</span>
						<span className={s.sep}>·</span>
						<span>{selectedEnv.value.length} переменных</span>
						<span className={s.sep}>·</span>
						<span
							className={`${s.envTokenPill} ${tokenInfo.variant === "warn" ? s.warn : ""}`}
							title={selectedEnv.accessToken ?? "Нет токена"}
						>
							<span className={s.dot} />
							{tokenInfo.label}
						</span>
					</div>
				</div>
				<div className={s.envHeroActions}>
					<button
						type="button"
						className={s.envBtn}
						onClick={handleDuplicateEnvironment}
						disabled={duplicating}
						title="Создать копию этого окружения"
					>
						<CopyIcon />
						{duplicating ? "Копируем…" : "Дублировать"}
					</button>
					<button
						type="button"
						className={`${s.envBtn} ${s.envBtnDanger}`}
						onClick={handleDeleteEnvironment}
					>
						<TrashIcon />
						Удалить
					</button>
					<button
						type="button"
						className={`${s.envBtn} ${s.envBtnPrimary}`}
						onClick={handleFetchToken}
						disabled={fetchingToken || !authUrl.trim() || !authTokenPath.trim()}
						title={
							!authUrl.trim() || !authTokenPath.trim()
								? "Заполните URL и token path в разделе авторизации"
								: ""
						}
					>
						<BoltIcon />
						{fetchingToken ? "Получаем…" : "Получить токен"}
					</button>
				</div>
			</div>
		);
	};

	return (
		<div className={s.envFrame}>
			<Header section="Environments" />

			<div className={s.shell}>
				<Sidebar />

				<div className={s.envPage}>
					{selectedEnv ? (
						<>
							{renderHero()}
							<div className={s.envPageBody}>
								<IdentificationSection
									label={label}
									onLabelChange={setLabel}
									onLabelBlur={() => saveEnvironment()}
									envTag={selectedEnv.env}
									accentColor={getEnvDotColor(selectedEnv.env)}
									statusHint={statusHint(envStatus)}
								/>
								<EndpointSection
									baseUrl={baseUrl}
									onBaseUrlChange={setBaseUrl}
									onBaseUrlBlur={() => saveEnvironment()}
									prefix={prefix}
									onPrefixChange={setPrefix}
									onPrefixBlur={() => saveEnvironment()}
								/>
								<AuthRequestSection
									method={authMethod}
									onMethodChange={(m) => {
										setAuthMethod(m);
										saveAuth({ method: m });
									}}
									url={authUrl}
									onUrlChange={setAuthUrl}
									onUrlBlur={() => saveAuth()}
									body={authBody}
									onBodyChange={setAuthBody}
									onBodyBlur={() => saveAuth()}
									tokenPath={authTokenPath}
									onTokenPathChange={setAuthTokenPath}
									onTokenPathBlur={() => saveAuth()}
									onFetchToken={handleFetchToken}
									onClearToken={handleClearToken}
									fetchingToken={fetchingToken}
									accessToken={selectedEnv.accessToken}
									tokenPillVariant={selectedEnv.accessToken ? "muted" : "warn"}
									tokenPillLabel={
										authStatus === "saving"
											? "сохраняем…"
											: authStatus === "saved"
												? "сохранено"
												: undefined
									}
								/>
								<VariablesSection
									variables={selectedEnv.value}
									onAdd={() => setModal("create")}
									onEdit={(v) => setModal(v)}
									onDelete={handleDeleteVariable}
								/>

								<div className={s.envFoot}>
									<span>id: {selectedEnv.id}</span>
									<span>все изменения сохраняются автоматически</span>
								</div>
							</div>
						</>
					) : (
						<div className={s.envPlaceholder}>
							<div className={s.envPlaceholderTitle}>Выберите окружение</div>
							<div className={s.envPlaceholderSub}>
								Или создайте новое в сайдбаре слева.
							</div>
						</div>
					)}
				</div>
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
					onSave={(v) => updateVariableInStore(v)}
				/>
			)}
			{variableToDelete && (
				<DeleteVariableModal
					variable={variableToDelete}
					onClose={() => setVariableToDelete(null)}
					onDeleted={(id) => removeVariable(id)}
				/>
			)}
			<Dialog.Root
				open={confirmDeleteEnv}
				onOpenChange={(open) =>
					!open && !deletingEnv && setConfirmDeleteEnv(false)
				}
			>
				<Dialog.Header>
					<Dialog.Title>Удалить окружение?</Dialog.Title>
					<Dialog.Subtitle>
						Действие необратимо. Окружение и его переменные будут удалены.
					</Dialog.Subtitle>
					<Dialog.Close />
				</Dialog.Header>
				<Dialog.Body>
					<p
						style={{
							margin: 0,
							fontSize: 13,
							color: "var(--ink)",
							lineHeight: "var(--lh-snug)",
						}}
					>
						Удалить окружение «{selectedEnv?.label}»?
					</p>
				</Dialog.Body>
				<Dialog.Footer>
					<Dialog.BtnCancel
						onClick={() => setConfirmDeleteEnv(false)}
						disabled={deletingEnv}
					>
						Отмена
					</Dialog.BtnCancel>
					<Dialog.BtnDanger
						onClick={confirmDeleteEnvironment}
						disabled={deletingEnv}
					>
						{deletingEnv ? "Удаляем…" : "Удалить"}
					</Dialog.BtnDanger>
				</Dialog.Footer>
			</Dialog.Root>
		</div>
	);
};
