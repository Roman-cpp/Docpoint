import type { FC } from "react";
import type {
	AuthType,
	BodyContentType,
	TokenPlacement,
	TokenSource,
	WsTokenPlacement,
} from "@/entities/environment";
import { BoltIcon, RefreshIcon, TrashIcon } from "@/shared/svg";
import {
	COMMON_HEADER_NAMES,
	type NameValueDraft,
	NameValueEditor,
} from "@/shared/ui-kit/controls";
import s from "../EnvironmentPage.module.css";
import {
	AUTH_TYPE_LABEL,
	AUTH_TYPES,
	type AuthMethod,
	BODY_CONTENT_TYPE_LABEL,
	BODY_CONTENT_TYPES,
	Field,
	HTTP_METHODS,
	Section,
	TOKEN_PLACEMENT_LABEL,
	TOKEN_PLACEMENTS,
	TOKEN_SOURCE_LABEL,
	TOKEN_SOURCES,
	WS_TOKEN_PLACEMENT_LABEL,
	WS_TOKEN_PLACEMENTS,
} from "../parts";

type Props = {
	authType: AuthType;
	onAuthTypeChange: (value: AuthType) => void;

	basicUsername: string;
	onBasicUsernameChange: (value: string) => void;
	onBasicUsernameBlur: () => void;
	basicPassword: string;
	onBasicPasswordChange: (value: string) => void;
	onBasicPasswordBlur: () => void;

	tokenSource: TokenSource;
	onTokenSourceChange: (value: TokenSource) => void;
	credentialName: string;
	onCredentialNameChange: (value: string) => void;
	onCredentialNameBlur: () => void;
	scheme: string;
	onSchemeChange: (value: string) => void;
	onSchemeBlur: () => void;

	/** Значение токена при `tokenSource === "static"` — редактируется напрямую. */
	staticToken: string;
	onStaticTokenChange: (value: string) => void;
	onStaticTokenBlur: () => void;

	method: AuthMethod;
	onMethodChange: (value: AuthMethod) => void;
	url: string;
	onUrlChange: (value: string) => void;
	onUrlBlur: () => void;
	body: string;
	onBodyChange: (value: string) => void;
	onBodyBlur: () => void;
	bodyContentType: BodyContentType;
	onBodyContentTypeChange: (value: BodyContentType) => void;
	extraHeaders: NameValueDraft[];
	onExtraHeadersChange: (headers: NameValueDraft[]) => void;
	tokenPath: string;
	onTokenPathChange: (value: string) => void;
	onTokenPathBlur: () => void;

	tokenPlacement: TokenPlacement;
	onTokenPlacementChange: (value: TokenPlacement) => void;
	wsTokenPlacement: WsTokenPlacement;
	onWsTokenPlacementChange: (value: WsTokenPlacement) => void;

	/** Куки, выданные сервером авторизации: только для показа. */
	authCookies: Record<string, string>;
	authCookieHost: string;
	onFetchToken: () => void;
	onClearToken: () => void;
	fetchingToken: boolean;
	accessToken: string | null;
	/** Статус автосохранения настроек — «сохраняем…» / «сохранено». */
	tokenPillLabel?: string;
};

const isMethod = (value: string): value is AuthMethod =>
	(HTTP_METHODS as readonly string[]).includes(value);

const isTokenPlacement = (value: string): value is TokenPlacement =>
	(TOKEN_PLACEMENTS as readonly string[]).includes(value);

const isWsTokenPlacement = (value: string): value is WsTokenPlacement =>
	(WS_TOKEN_PLACEMENTS as readonly string[]).includes(value);

const isAuthType = (value: string): value is AuthType =>
	(AUTH_TYPES as readonly string[]).includes(value);

const isTokenSource = (value: string): value is TokenSource =>
	(TOKEN_SOURCES as readonly string[]).includes(value);

const isBodyContentType = (value: string): value is BodyContentType =>
	(BODY_CONTENT_TYPES as readonly string[]).includes(value);

const methodClass = (method: AuthMethod) => {
	const mod = method.toLowerCase();
	return `${s.envSelect} ${s.method} ${s[mod] ?? ""}`;
};

export const AuthRequestSection: FC<Props> = ({
	authType,
	onAuthTypeChange,
	basicUsername,
	onBasicUsernameChange,
	onBasicUsernameBlur,
	basicPassword,
	onBasicPasswordChange,
	onBasicPasswordBlur,
	tokenSource,
	onTokenSourceChange,
	credentialName,
	onCredentialNameChange,
	onCredentialNameBlur,
	scheme,
	onSchemeChange,
	onSchemeBlur,
	staticToken,
	onStaticTokenChange,
	onStaticTokenBlur,
	method,
	onMethodChange,
	url,
	onUrlChange,
	onUrlBlur,
	body,
	onBodyChange,
	onBodyBlur,
	bodyContentType,
	onBodyContentTypeChange,
	extraHeaders,
	onExtraHeadersChange,
	tokenPath,
	onTokenPathChange,
	onTokenPathBlur,
	tokenPlacement,
	onTokenPlacementChange,
	wsTokenPlacement,
	onWsTokenPlacementChange,
	authCookies,
	authCookieHost,
	onFetchToken,
	onClearToken,
	fetchingToken,
	accessToken,
	tokenPillLabel,
}) => {
	const fetchDisabled = fetchingToken || !url.trim();
	const bodyDisabled = method === "GET";
	const cookieNames = Object.keys(authCookies);
	const isToken = authType === "token";
	const isLogin = isToken && tokenSource === "login";
	const isStatic = isToken && tokenSource === "static";
	/** Обе стороны ходят по кукам — токен из тела логина не нужен вовсе. */
	const cookieOnly =
		tokenPlacement === "cookie" && wsTokenPlacement === "cookie";
	const hasSession = Boolean(accessToken) || cookieNames.length > 0;

	/** Что окружение сейчас предъявляет серверу: токен, куки или ничего. */
	const sessionSummary = () => {
		const parts: string[] = [];
		if (accessToken) {
			const short = `${accessToken.slice(0, 24)}${accessToken.length > 24 ? "…" : ""}`;
			parts.push(`токен · ${short}`);
		}
		if (cookieNames.length) parts.push(`куки · ${cookieNames.length}`);
		return parts.length ? parts.join(" · ") : "не авторизовано";
	};

	return (
		<Section
			title="Авторизация"
			sub="как окружение подтверждает себя перед API"
			right={
				tokenPillLabel ? (
					<span className={s.envTokenPill}>
						<span className={s.dot} />
						{tokenPillLabel}
					</span>
				) : null
			}
		>
			<Field label="Тип авторизации">
				<div className={`${s.envSelect} ${s.method}`}>
					<select
						value={authType}
						onChange={(e) =>
							isAuthType(e.target.value) && onAuthTypeChange(e.target.value)
						}
					>
						{AUTH_TYPES.map((t) => (
							<option key={t} value={t}>
								{AUTH_TYPE_LABEL[t]}
							</option>
						))}
					</select>
				</div>
			</Field>

			{authType === "basic" && (
				<>
					<Field label="Логин">
						<input
							className={s.envInput}
							value={basicUsername}
							onChange={(e) => onBasicUsernameChange(e.target.value)}
							onBlur={onBasicUsernameBlur}
							autoComplete="off"
							placeholder="—"
						/>
					</Field>
					<Field label="Пароль">
						<input
							className={s.envInput}
							type="password"
							value={basicPassword}
							onChange={(e) => onBasicPasswordChange(e.target.value)}
							onBlur={onBasicPasswordBlur}
							autoComplete="new-password"
							placeholder="—"
						/>
					</Field>
					<div className={s.envAuthFoot}>
						<span className={s.envAuthFootMeta}>
							Применяется ко всем запросам и WebSocket-рукопожатию автоматически
						</span>
					</div>
				</>
			)}

			{isToken && (
				<>
					<Field label="Источник токена">
						<div className={`${s.envSelect} ${s.method}`}>
							<select
								value={tokenSource}
								onChange={(e) =>
									isTokenSource(e.target.value) &&
									onTokenSourceChange(e.target.value)
								}
							>
								{TOKEN_SOURCES.map((src) => (
									<option key={src} value={src}>
										{TOKEN_SOURCE_LABEL[src]}
									</option>
								))}
							</select>
						</div>
					</Field>

					<Field
						label="Куда подставлять"
						help="как токен добавляется к HTTP-запросам этого окружения"
					>
						<div className={`${s.envSelect} ${s.method}`}>
							<select
								value={tokenPlacement}
								onChange={(e) =>
									isTokenPlacement(e.target.value) &&
									onTokenPlacementChange(e.target.value)
								}
							>
								{TOKEN_PLACEMENTS.map((p) => (
									<option key={p} value={p}>
										{TOKEN_PLACEMENT_LABEL[p]}
									</option>
								))}
							</select>
						</div>
					</Field>
					<Field
						label="Имя"
						help={
							tokenPlacement === "header"
								? "имя заголовка, например Authorization или X-Api-Key"
								: tokenPlacement === "query"
									? "имя query-параметра, например api_key"
									: "имя куки"
						}
					>
						<input
							className={s.envInput}
							value={credentialName}
							onChange={(e) => onCredentialNameChange(e.target.value)}
							onBlur={onCredentialNameBlur}
							placeholder="Authorization"
						/>
					</Field>
					{tokenPlacement === "header" && (
						<Field
							label="Префикс"
							help="Bearer, Token, JWT — оставьте пустым, если без префикса"
						>
							<input
								className={s.envInput}
								value={scheme}
								onChange={(e) => onSchemeChange(e.target.value)}
								onBlur={onSchemeBlur}
								placeholder="Bearer"
							/>
						</Field>
					)}

					{isStatic && (
						<Field label="Значение токена" help="вводится вручную, без запроса">
							<input
								className={s.envInput}
								type="password"
								value={staticToken}
								onChange={(e) => onStaticTokenChange(e.target.value)}
								onBlur={onStaticTokenBlur}
								autoComplete="new-password"
								placeholder="—"
							/>
						</Field>
					)}

					{isLogin && (
						<>
							<Field label="Метод">
								<div className={methodClass(method)}>
									<select
										value={method}
										onChange={(e) =>
											isMethod(e.target.value) && onMethodChange(e.target.value)
										}
									>
										{HTTP_METHODS.map((m) => (
											<option key={m} value={m}>
												{m}
											</option>
										))}
									</select>
								</div>
							</Field>
							<Field
								label={
									<>
										URL<span className={s.req}>*</span>
									</>
								}
							>
								<input
									className={s.envInput}
									value={url}
									onChange={(e) => onUrlChange(e.target.value)}
									onBlur={onUrlBlur}
									placeholder="https://api.example.com/auth/login"
								/>
							</Field>
							<Field
								label="Body"
								help={<>{"{{переменная}}"} подставится при запросе</>}
							>
								<textarea
									className={s.envTextarea}
									value={body}
									onChange={(e) => onBodyChange(e.target.value)}
									onBlur={onBodyBlur}
									disabled={bodyDisabled}
									placeholder='{"email":"{{ADMIN_EMAIL}}","password":"{{ADMIN_PASSWORD}}"}'
								/>
							</Field>
							{body.trim() !== "" && (
								<Field label="Content-Type тела">
									<div className={`${s.envSelect} ${s.method}`}>
										<select
											value={bodyContentType}
											onChange={(e) =>
												isBodyContentType(e.target.value) &&
												onBodyContentTypeChange(e.target.value)
											}
										>
											{BODY_CONTENT_TYPES.map((t) => (
												<option key={t} value={t}>
													{BODY_CONTENT_TYPE_LABEL[t]}
												</option>
											))}
										</select>
									</div>
								</Field>
							)}
							<Field label="Доп. заголовки запроса">
								<NameValueEditor
									title="Headers"
									addLabel="+ Add header"
									suggestions={COMMON_HEADER_NAMES}
									duplicateHint="Заголовок повторяется"
									rows={extraHeaders}
									onChange={onExtraHeadersChange}
								/>
							</Field>
							{/* Обе стороны на куках — токен из тела нигде не используется. */}
							{!cookieOnly && (
								<Field
									label="Token path"
									help="путь в JSON-ответе (например data.accessToken)"
								>
									<input
										className={s.envInput}
										value={tokenPath}
										onChange={(e) => onTokenPathChange(e.target.value)}
										onBlur={onTokenPathBlur}
										placeholder="data.accessToken"
									/>
								</Field>
							)}
						</>
					)}

					<Field
						label="Куда подставлять токен в WebSocket"
						help="при рукопожатии: многие WS-серверы читают только query-параметр"
					>
						<div className={`${s.envSelect} ${s.method}`}>
							<select
								value={wsTokenPlacement}
								onChange={(e) =>
									isWsTokenPlacement(e.target.value) &&
									onWsTokenPlacementChange(e.target.value)
								}
							>
								{WS_TOKEN_PLACEMENTS.map((p) => (
									<option key={p} value={p}>
										{WS_TOKEN_PLACEMENT_LABEL[p]}
									</option>
								))}
							</select>
						</div>
					</Field>

					{isLogin &&
						(tokenPlacement === "cookie" || wsTokenPlacement === "cookie") && (
							<Field
								label="Куки сессии"
								help={
									authCookieHost
										? `выданы сервером ${authCookieHost}; уходят только на него и его поддомены`
										: "появятся после авторизации: что сервер прислал в Set-Cookie, то и уйдёт в запросы"
								}
							>
								<div className={s.envCookieList}>
									{cookieNames.length ? (
										cookieNames.map((name) => (
											<span key={name} className={s.envCookieChip} title={name}>
												{name}
											</span>
										))
									) : (
										<span className={s.envCookieEmpty}>пока нет</span>
									)}
								</div>
							</Field>
						)}

					<div className={s.envAuthFoot}>
						{isLogin && (
							<button
								type="button"
								className={`${s.envBtn} ${s.envBtnPrimary}`}
								onClick={onFetchToken}
								disabled={fetchDisabled}
								title={!url.trim() ? "Заполните URL" : ""}
							>
								{fetchingToken ? <RefreshIcon /> : <BoltIcon />}
								{fetchingToken ? "Получаем…" : "Авторизоваться"}
							</button>
						)}
						{hasSession && (
							<button
								type="button"
								className={`${s.envBtn} ${s.envBtnGhost}`}
								onClick={onClearToken}
							>
								<TrashIcon size={12} />
								Очистить сессию
							</button>
						)}
						<span className={s.envAuthFootMeta}>{sessionSummary()}</span>
					</div>
				</>
			)}
		</Section>
	);
};
