import { type FC, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import type {
	AuthType,
	BodyContentType,
	TokenPlacement,
	TokenSource,
	Variable,
	WsTokenPlacement,
} from "@/entities/environment";
import {
	authenticateEnvironmentApi,
	clearEnvironmentSessionApi,
	DeleteVariableModal,
	deleteEnvironmentApi,
	duplicateEnvironmentApi,
	getEnvironmentAuthApi,
	getEnvironmentProxyApi,
	updateEnvironmentApi,
	updateEnvironmentAuthApi,
	updateEnvironmentProxyApi,
	updateEnvironmentTokenApi,
	VariableModal,
} from "@/entities/environment";
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
import { joinUrl } from "@/shared/lib/url";
import { BoltIcon, CopyIcon, TrashIcon } from "@/shared/svg";
import { createHeaderDraft, type HeaderDraft } from "@/shared/ui-kit/controls";
import { Dialog } from "@/shared/ui-kit/modal";
import { Header } from "@/widgets/layout";
import { AuthRequestSection } from "../AuthRequestSection";
import { EndpointSection } from "../EndpointSection";
import s from "../EnvironmentPage.module.css";
import { IdentificationSection } from "../IdentificationSection";
import { ProxySection } from "../ProxySection";
import { type AuthMethod, HTTP_METHODS } from "../parts";
import { Sidebar } from "../Sidebar";
import { VariablesSection } from "../VariablesSection";

const asMethod = (value: string): AuthMethod => {
	const upper = value.toUpperCase();
	return (HTTP_METHODS as readonly string[]).includes(upper)
		? (upper as AuthMethod)
		: "POST";
};

const asTokenPlacement = (value: string): TokenPlacement =>
	value === "cookie" || value === "query" ? value : "header";

const asWsTokenPlacement = (value: string): WsTokenPlacement =>
	value === "cookie" || value === "header" ? value : "query";

const asAuthType = (value: string): AuthType =>
	value === "none" || value === "basic" ? value : "token";

const asTokenSource = (value: string): TokenSource =>
	value === "static" ? "static" : "login";

const asBodyContentType = (value: string): BodyContentType =>
	value === "form" ? "form" : "json";

/** Заголовки логин-запроса как редактируемый список ↔ как объект для API. */
const headersToRecord = (headers: HeaderDraft[]): Record<string, string> => {
	const record: Record<string, string> = {};
	for (const h of headers) {
		const name = h.name.trim();
		if (!h.enabled || !name) continue;
		record[name] = h.value;
	}
	return record;
};

const recordToHeaders = (record: Record<string, string>): HeaderDraft[] =>
	Object.entries(record).map(([name, value]) => ({
		...createHeaderDraft(),
		name,
		value,
	}));

const sameRecord = (a: Record<string, string>, b: Record<string, string>) => {
	const aKeys = Object.keys(a).sort();
	const bKeys = Object.keys(b).sort();
	if (aKeys.length !== bKeys.length) return false;
	return aKeys.every((k, i) => k === bKeys[i] && a[k] === b[k]);
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
	const [authType, setAuthType] = useState<AuthType>("token");
	const [basicUsername, setBasicUsername] = useState("");
	const [basicPassword, setBasicPassword] = useState("");
	const [tokenSource, setTokenSource] = useState<TokenSource>("login");
	const [credentialName, setCredentialName] = useState("Authorization");
	const [scheme, setScheme] = useState("Bearer");
	const [staticToken, setStaticToken] = useState("");
	const [authUrl, setAuthUrl] = useState("");
	const [authMethod, setAuthMethod] = useState<AuthMethod>("POST");
	const [authBody, setAuthBody] = useState("");
	const [bodyContentType, setBodyContentType] =
		useState<BodyContentType>("json");
	const [extraHeaders, setExtraHeaders] = useState<HeaderDraft[]>([]);
	const [authTokenPath, setAuthTokenPath] = useState("");
	const [authTokenPlacement, setAuthTokenPlacement] =
		useState<TokenPlacement>("header");
	const [authWsTokenPlacement, setAuthWsTokenPlacement] =
		useState<WsTokenPlacement>("query");
	/** Куки сессии окружения: их пишет только авторизация, руками не правятся. */
	const [authCookies, setAuthCookies] = useState<Record<string, string>>({});
	const [authCookieHost, setAuthCookieHost] = useState("");
	const [authStatus, setAuthStatus] = useState<SaveStatus>("idle");
	const [fetchingToken, setFetchingToken] = useState(false);
	const loadedAuthRef = useRef<{
		authType: AuthType;
		basicUsername: string;
		basicPassword: string;
		tokenSource: TokenSource;
		credentialName: string;
		scheme: string;
		url: string;
		method: AuthMethod;
		body: string;
		bodyContentType: BodyContentType;
		extraHeaders: Record<string, string>;
		tokenPath: string;
		tokenPlacement: TokenPlacement;
		wsTokenPlacement: WsTokenPlacement;
	} | null>(null);
	const loadedStaticTokenRef = useRef("");

	// Proxy config
	const [proxyEnabled, setProxyEnabled] = useState(false);
	const [proxyUrl, setProxyUrl] = useState("");
	const [proxyUsername, setProxyUsername] = useState("");
	const [proxyPassword, setProxyPassword] = useState("");
	const [proxyBypass, setProxyBypass] = useState("");
	const [proxyInsecure, setProxyInsecure] = useState(false);
	const [timeoutSeconds, setTimeoutSeconds] = useState("");
	const [proxyStatus, setProxyStatus] = useState<SaveStatus>("idle");
	const loadedProxyRef = useRef<{
		enabled: boolean;
		url: string;
		username: string;
		password: string;
		bypass: string;
		insecure: boolean;
		timeoutMs: number;
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
			loadedProxyRef.current = null;
			return;
		}
		const env = envSnapshotRef.current;
		if (!env || env.id !== envId) return;
		setLabel(env.label);
		setBaseUrl(env.baseUrl);
		setPrefix(env.prefix);
		setEnvStatus("idle");
		setStaticToken(env.accessToken ?? "");
		loadedStaticTokenRef.current = env.accessToken ?? "";

		let cancelled = false;
		getEnvironmentAuthApi({ environmentId: envId }).then((auth) => {
			if (cancelled) return;
			const method = asMethod(auth.method || "POST");
			const tokenPlacement = asTokenPlacement(auth.tokenPlacement);
			const wsTokenPlacement = asWsTokenPlacement(auth.wsTokenPlacement);
			const type = asAuthType(auth.authType);
			const source = asTokenSource(auth.tokenSource);
			const contentType = asBodyContentType(auth.bodyContentType);
			const extra = auth.extraHeaders ?? {};
			setAuthType(type);
			setBasicUsername(auth.basicUsername ?? "");
			setBasicPassword(auth.basicPassword ?? "");
			setTokenSource(source);
			setCredentialName(auth.credentialName || "Authorization");
			setScheme(auth.scheme ?? "");
			setAuthUrl(auth.url);
			setAuthMethod(method);
			setAuthBody(auth.body);
			setBodyContentType(contentType);
			setExtraHeaders(recordToHeaders(extra));
			setAuthTokenPath(auth.tokenPath);
			setAuthTokenPlacement(tokenPlacement);
			setAuthWsTokenPlacement(wsTokenPlacement);
			setAuthCookies(auth.authCookies ?? {});
			setAuthCookieHost(auth.authCookieHost ?? "");
			setAuthStatus("idle");
			loadedAuthRef.current = {
				authType: type,
				basicUsername: auth.basicUsername ?? "",
				basicPassword: auth.basicPassword ?? "",
				tokenSource: source,
				credentialName: auth.credentialName || "Authorization",
				scheme: auth.scheme ?? "",
				url: auth.url,
				method,
				body: auth.body,
				bodyContentType: contentType,
				extraHeaders: extra,
				tokenPath: auth.tokenPath,
				tokenPlacement,
				wsTokenPlacement,
			};
		});
		getEnvironmentProxyApi({ environmentId: envId }).then((proxy) => {
			if (cancelled) return;
			setProxyEnabled(proxy.enabled);
			setProxyUrl(proxy.url);
			setProxyUsername(proxy.username);
			setProxyPassword(proxy.password);
			setProxyBypass(proxy.bypass);
			setProxyInsecure(proxy.insecure);
			setTimeoutSeconds(
				proxy.timeoutMs > 0 ? String(proxy.timeoutMs / 1000) : "",
			);
			setProxyStatus("idle");
			loadedProxyRef.current = {
				enabled: proxy.enabled,
				url: proxy.url,
				username: proxy.username,
				password: proxy.password,
				bypass: proxy.bypass,
				insecure: proxy.insecure,
				timeoutMs: proxy.timeoutMs,
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
		authType?: AuthType;
		basicUsername?: string;
		basicPassword?: string;
		tokenSource?: TokenSource;
		credentialName?: string;
		scheme?: string;
		url?: string;
		method?: AuthMethod;
		body?: string;
		bodyContentType?: BodyContentType;
		extraHeaders?: Record<string, string>;
		tokenPath?: string;
		tokenPlacement?: TokenPlacement;
		wsTokenPlacement?: WsTokenPlacement;
	}) => {
		if (!selectedEnv) return;
		const loaded = loadedAuthRef.current;
		const next = {
			authType: overrides?.authType ?? authType,
			basicUsername: overrides?.basicUsername ?? basicUsername,
			basicPassword: overrides?.basicPassword ?? basicPassword,
			tokenSource: overrides?.tokenSource ?? tokenSource,
			credentialName: (overrides?.credentialName ?? credentialName).trim(),
			scheme: overrides?.scheme ?? scheme,
			url: (overrides?.url ?? authUrl).trim(),
			method: overrides?.method ?? authMethod,
			body: overrides?.body ?? authBody,
			bodyContentType: overrides?.bodyContentType ?? bodyContentType,
			extraHeaders: overrides?.extraHeaders ?? headersToRecord(extraHeaders),
			tokenPath: (overrides?.tokenPath ?? authTokenPath).trim(),
			tokenPlacement: overrides?.tokenPlacement ?? authTokenPlacement,
			wsTokenPlacement: overrides?.wsTokenPlacement ?? authWsTokenPlacement,
		};
		if (
			loaded &&
			next.authType === loaded.authType &&
			next.basicUsername === loaded.basicUsername &&
			next.basicPassword === loaded.basicPassword &&
			next.tokenSource === loaded.tokenSource &&
			next.credentialName === loaded.credentialName &&
			next.scheme === loaded.scheme &&
			next.url === loaded.url &&
			next.method === loaded.method &&
			next.body === loaded.body &&
			next.bodyContentType === loaded.bodyContentType &&
			sameRecord(next.extraHeaders, loaded.extraHeaders) &&
			next.tokenPath === loaded.tokenPath &&
			next.tokenPlacement === loaded.tokenPlacement &&
			next.wsTokenPlacement === loaded.wsTokenPlacement
		) {
			return;
		}
		setAuthStatus("saving");
		try {
			await updateEnvironmentAuthApi({
				environmentId: selectedEnv.id,
				...next,
			});
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

	/** Значение статического токена не идёт через `updateEnvironmentAuthApi` —
	 * это то же поле, что и токен, полученный логином, поэтому пишется тем же
	 * путём, что и после успешной авторизации. */
	const saveStaticToken = async () => {
		if (!selectedEnv) return;
		const value = staticToken.trim();
		if (value === loadedStaticTokenRef.current) return;
		try {
			await updateEnvironmentTokenApi({
				environmentId: selectedEnv.id,
				token: value || null,
			});
			loadedStaticTokenRef.current = value;
			patchToken(value || null);
		} catch {
			toast({
				variant: "error",
				title: "Error",
				description: "Failed to save token",
			});
		}
	};

	const saveProxy = async (overrides?: {
		enabled?: boolean;
		url?: string;
		username?: string;
		password?: string;
		bypass?: string;
		insecure?: boolean;
		timeoutMs?: number;
	}) => {
		if (!selectedEnv) return;
		const loaded = loadedProxyRef.current;
		const next = {
			enabled: overrides?.enabled ?? proxyEnabled,
			url: (overrides?.url ?? proxyUrl).trim(),
			username: overrides?.username ?? proxyUsername,
			password: overrides?.password ?? proxyPassword,
			bypass: (overrides?.bypass ?? proxyBypass).trim(),
			insecure: overrides?.insecure ?? proxyInsecure,
			timeoutMs:
				overrides?.timeoutMs ??
				Math.max(0, Math.round(Number(timeoutSeconds || 0) * 1000)),
		};
		if (
			loaded &&
			next.enabled === loaded.enabled &&
			next.url === loaded.url &&
			next.username === loaded.username &&
			next.password === loaded.password &&
			next.bypass === loaded.bypass &&
			next.insecure === loaded.insecure &&
			next.timeoutMs === loaded.timeoutMs
		) {
			return;
		}
		setProxyStatus("saving");
		try {
			await updateEnvironmentProxyApi({
				environmentId: selectedEnv.id,
				...next,
			});
			loadedProxyRef.current = next;
			setProxyStatus("saved");
			setTimeout(
				() =>
					setProxyStatus((status) => (status === "saved" ? "idle" : status)),
				1500,
			);
		} catch {
			setProxyStatus("error");
			toast({
				variant: "error",
				title: "Error",
				description: "Failed to save proxy config",
			});
		}
	};

	/**
	 * Запрос авторизации целиком выполняет бэкенд: он же достаёт токен по
	 * `tokenPath` и забирает куки из `Set-Cookie`, поэтому и кнопка, и
	 * авто-обновление при 401 работают по одному и тому же коду.
	 */
	const handleFetchToken = async () => {
		if (!selectedEnv || !authUrl.trim()) return;
		// Make sure latest auth config is persisted before firing the request.
		await saveAuth();
		setFetchingToken(true);
		try {
			const auth = await authenticateEnvironmentApi({
				environmentId: selectedEnv.id,
			});
			if (!auth) {
				toast({
					variant: "error",
					title: "Авторизация ничего не дала",
					description: authTokenPath.trim()
						? `Сервер не вернул ни кук, ни значения по пути "${authTokenPath.trim()}"`
						: "Сервер не вернул ни кук, ни токена — укажите token path, если токен приходит в теле",
				});
				return;
			}

			const cookieNames = Object.keys(auth.authCookies ?? {});
			setAuthCookies(auth.authCookies ?? {});
			setAuthCookieHost(auth.authCookieHost ?? "");
			setStaticToken(auth.accessToken ?? "");
			loadedStaticTokenRef.current = auth.accessToken ?? "";
			patchToken(auth.accessToken);
			toast({
				variant: "success",
				title: auth.accessToken ? "Токен получен" : "Куки сессии получены",
				description: cookieNames.length
					? `Куки: ${cookieNames.join(", ")}`
					: undefined,
			});
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
			// Токен и куки гасим вместе: иначе «очистить» оставило бы рабочую
			// сессию в куках, и запросы уходили бы авторизованными.
			await clearEnvironmentSessionApi({ environmentId: selectedEnv.id });
			patchToken(null);
			setStaticToken("");
			loadedStaticTokenRef.current = "";
			setAuthCookies({});
			setAuthCookieHost("");
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
			await deleteEnvironmentApi({ id: selectedEnv.id });
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
			const copy = await duplicateEnvironmentApi({
				environmentId: selectedEnv.id,
			});
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

	const canFetchToken = authType === "token" && tokenSource === "login";

	const renderHero = () => {
		if (!selectedEnv) return null;
		const accent = getEnvDotColor(selectedEnv.env);
		const finalUrl = joinUrl(baseUrl, prefix) || "—";
		// Окружение может авторизоваться токеном (статическим или по логину),
		// Basic-заголовком, куками или вовсе без авторизации.
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
						<TrashIcon size={12} />
						Удалить
					</button>
					{canFetchToken && (
						<button
							type="button"
							className={`${s.envBtn} ${s.envBtnPrimary}`}
							onClick={handleFetchToken}
							disabled={fetchingToken || !authUrl.trim()}
							title={
								!authUrl.trim()
									? "Заполните URL в разделе авторизации"
									: "Выполнить запрос авторизации и сохранить токен и куки"
							}
						>
							<BoltIcon />
							{fetchingToken ? "Получаем…" : "Авторизоваться"}
						</button>
					)}
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
								<ProxySection
									enabled={proxyEnabled}
									onEnabledChange={(v) => {
										setProxyEnabled(v);
										saveProxy({ enabled: v });
									}}
									url={proxyUrl}
									onUrlChange={setProxyUrl}
									onUrlBlur={() => saveProxy()}
									username={proxyUsername}
									onUsernameChange={setProxyUsername}
									onUsernameBlur={() => saveProxy()}
									password={proxyPassword}
									onPasswordChange={setProxyPassword}
									onPasswordBlur={() => saveProxy()}
									bypass={proxyBypass}
									onBypassChange={setProxyBypass}
									onBypassBlur={() => saveProxy()}
									insecure={proxyInsecure}
									onInsecureChange={(v) => {
										setProxyInsecure(v);
										saveProxy({ insecure: v });
									}}
									timeoutSeconds={timeoutSeconds}
									onTimeoutSecondsChange={setTimeoutSeconds}
									onTimeoutSecondsBlur={() => saveProxy()}
									pillLabel={
										proxyStatus === "saving"
											? "сохраняем…"
											: proxyStatus === "saved"
												? "сохранено"
												: undefined
									}
								/>
								<AuthRequestSection
									authType={authType}
									onAuthTypeChange={(v) => {
										setAuthType(v);
										saveAuth({ authType: v });
									}}
									basicUsername={basicUsername}
									onBasicUsernameChange={setBasicUsername}
									onBasicUsernameBlur={() => saveAuth()}
									basicPassword={basicPassword}
									onBasicPasswordChange={setBasicPassword}
									onBasicPasswordBlur={() => saveAuth()}
									tokenSource={tokenSource}
									onTokenSourceChange={(v) => {
										setTokenSource(v);
										saveAuth({ tokenSource: v });
									}}
									credentialName={credentialName}
									onCredentialNameChange={setCredentialName}
									onCredentialNameBlur={() => saveAuth()}
									scheme={scheme}
									onSchemeChange={setScheme}
									onSchemeBlur={() => saveAuth()}
									staticToken={staticToken}
									onStaticTokenChange={setStaticToken}
									onStaticTokenBlur={saveStaticToken}
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
									bodyContentType={bodyContentType}
									onBodyContentTypeChange={(v) => {
										setBodyContentType(v);
										saveAuth({ bodyContentType: v });
									}}
									extraHeaders={extraHeaders}
									onExtraHeadersChange={(headers) => {
										setExtraHeaders(headers);
										saveAuth({ extraHeaders: headersToRecord(headers) });
									}}
									tokenPath={authTokenPath}
									onTokenPathChange={setAuthTokenPath}
									onTokenPathBlur={() => saveAuth()}
									tokenPlacement={authTokenPlacement}
									onTokenPlacementChange={(p) => {
										setAuthTokenPlacement(p);
										saveAuth({ tokenPlacement: p });
									}}
									wsTokenPlacement={authWsTokenPlacement}
									onWsTokenPlacementChange={(p) => {
										setAuthWsTokenPlacement(p);
										saveAuth({ wsTokenPlacement: p });
									}}
									authCookies={authCookies}
									authCookieHost={authCookieHost}
									onFetchToken={handleFetchToken}
									onClearToken={handleClearToken}
									fetchingToken={fetchingToken}
									accessToken={selectedEnv.accessToken}
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
