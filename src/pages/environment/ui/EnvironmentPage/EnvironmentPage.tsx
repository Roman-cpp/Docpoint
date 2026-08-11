import { type FC, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import type {
	TokenPlacement,
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
	updateEnvironmentApi,
	updateEnvironmentAuthApi,
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

const asMethod = (value: string): AuthMethod => {
	const upper = value.toUpperCase();
	return (HTTP_METHODS as readonly string[]).includes(upper)
		? (upper as AuthMethod)
		: "POST";
};

const asTokenPlacement = (value: string): TokenPlacement =>
	value === "cookie" ? "cookie" : "header";

const asWsTokenPlacement = (value: string): WsTokenPlacement =>
	value === "cookie" || value === "header" ? value : "query";

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
		url: string;
		method: AuthMethod;
		body: string;
		tokenPath: string;
		tokenPlacement: TokenPlacement;
		wsTokenPlacement: WsTokenPlacement;
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
		getEnvironmentAuthApi(envId).then((auth) => {
			if (cancelled) return;
			const method = asMethod(auth.method || "POST");
			const tokenPlacement = asTokenPlacement(auth.tokenPlacement);
			const wsTokenPlacement = asWsTokenPlacement(auth.wsTokenPlacement);
			setAuthUrl(auth.url);
			setAuthMethod(method);
			setAuthBody(auth.body);
			setAuthTokenPath(auth.tokenPath);
			setAuthTokenPlacement(tokenPlacement);
			setAuthWsTokenPlacement(wsTokenPlacement);
			setAuthCookies(auth.authCookies ?? {});
			setAuthCookieHost(auth.authCookieHost ?? "");
			setAuthStatus("idle");
			loadedAuthRef.current = {
				url: auth.url,
				method,
				body: auth.body,
				tokenPath: auth.tokenPath,
				tokenPlacement,
				wsTokenPlacement,
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
		tokenPlacement?: TokenPlacement;
		wsTokenPlacement?: WsTokenPlacement;
	}) => {
		if (!selectedEnv) return;
		const loaded = loadedAuthRef.current;
		const next = {
			url: (overrides?.url ?? authUrl).trim(),
			method: overrides?.method ?? authMethod,
			body: overrides?.body ?? authBody,
			tokenPath: (overrides?.tokenPath ?? authTokenPath).trim(),
			tokenPlacement: overrides?.tokenPlacement ?? authTokenPlacement,
			wsTokenPlacement: overrides?.wsTokenPlacement ?? authWsTokenPlacement,
		};
		if (
			loaded &&
			next.url === loaded.url &&
			next.method === loaded.method &&
			next.body === loaded.body &&
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
			const auth = await authenticateEnvironmentApi(selectedEnv.id);
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
			await clearEnvironmentSessionApi(selectedEnv.id);
			patchToken(null);
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
		const finalUrl = joinUrl(baseUrl, prefix) || "—";
		// Окружение может авторизоваться токеном, куками или и тем, и другим.
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
						<TrashIcon />
						Удалить
					</button>
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
