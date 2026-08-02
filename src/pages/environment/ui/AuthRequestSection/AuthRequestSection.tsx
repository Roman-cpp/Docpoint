import type { FC } from "react";
import type { TokenPlacement, WsTokenPlacement } from "@/entities/environment";
import s from "../EnvironmentPage.module.css";
import {
	type AuthMethod,
	BoltIcon,
	Field,
	HTTP_METHODS,
	RefreshIcon,
	Section,
	TOKEN_PLACEMENT_LABEL,
	TOKEN_PLACEMENTS,
	TrashIcon,
	WS_TOKEN_PLACEMENT_LABEL,
	WS_TOKEN_PLACEMENTS,
} from "../parts";

type Props = {
	method: AuthMethod;
	onMethodChange: (value: AuthMethod) => void;
	url: string;
	onUrlChange: (value: string) => void;
	onUrlBlur: () => void;
	body: string;
	onBodyChange: (value: string) => void;
	onBodyBlur: () => void;
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

const methodClass = (method: AuthMethod) => {
	const mod = method.toLowerCase();
	return `${s.envSelect} ${s.method} ${s[mod] ?? ""}`;
};

export const AuthRequestSection: FC<Props> = ({
	method,
	onMethodChange,
	url,
	onUrlChange,
	onUrlBlur,
	body,
	onBodyChange,
	onBodyBlur,
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
	/** Обе стороны ходят по кукам — токен из тела не нужен вовсе. */
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
			title="Запрос авторизации"
			sub="выполняется по кнопке «Авторизоваться»"
			right={
				tokenPillLabel ? (
					<span className={s.envTokenPill}>
						<span className={s.dot} />
						{tokenPillLabel}
					</span>
				) : null
			}
		>
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
			<Field
				label="Куда подставлять токен"
				help="как полученный токен добавляется к запросам этого окружения"
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
			{(tokenPlacement === "cookie" || wsTokenPlacement === "cookie") && (
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
				{hasSession && (
					<button
						type="button"
						className={`${s.envBtn} ${s.envBtnGhost}`}
						onClick={onClearToken}
					>
						<TrashIcon />
						Очистить сессию
					</button>
				)}
				<span className={s.envAuthFootMeta}>{sessionSummary()}</span>
			</div>
		</Section>
	);
};
