import type { FC } from "react";
import type { TokenPlacement } from "@/entities/environment";
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
	cookieName: string;
	onCookieNameChange: (value: string) => void;
	onCookieNameBlur: () => void;
	onFetchToken: () => void;
	onClearToken: () => void;
	fetchingToken: boolean;
	accessToken: string | null;
	tokenPillVariant?: "ok" | "warn" | "muted";
	tokenPillLabel?: string;
};

const isMethod = (value: string): value is AuthMethod =>
	(HTTP_METHODS as readonly string[]).includes(value);

const isTokenPlacement = (value: string): value is TokenPlacement =>
	(TOKEN_PLACEMENTS as readonly string[]).includes(value);

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
	cookieName,
	onCookieNameChange,
	onCookieNameBlur,
	onFetchToken,
	onClearToken,
	fetchingToken,
	accessToken,
	tokenPillVariant = "muted",
	tokenPillLabel,
}) => {
	const fetchDisabled = fetchingToken || !url.trim() || !tokenPath.trim();
	const bodyDisabled = method === "GET";
	const pillClass = `${s.envTokenPill} ${tokenPillVariant === "warn" ? s.warn : ""}`;

	return (
		<Section
			title="Запрос авторизации"
			sub="выполняется по кнопке «Получить токен»"
			right={
				tokenPillLabel ? (
					<span className={pillClass}>
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
			{tokenPlacement === "cookie" && (
				<Field
					label="Cookie name"
					help="имя cookie, в которую попадёт токен (например session_id)"
				>
					<input
						className={s.envInput}
						value={cookieName}
						onChange={(e) => onCookieNameChange(e.target.value)}
						onBlur={onCookieNameBlur}
						placeholder="token"
					/>
				</Field>
			)}
			<div className={s.envAuthFoot}>
				<button
					type="button"
					className={`${s.envBtn} ${s.envBtnPrimary}`}
					onClick={onFetchToken}
					disabled={fetchDisabled}
					title={
						!url.trim() || !tokenPath.trim() ? "Заполните URL и token path" : ""
					}
				>
					{fetchingToken ? <RefreshIcon /> : <BoltIcon />}
					{fetchingToken ? "Получаем…" : "Получить токен"}
				</button>
				{accessToken && (
					<button
						type="button"
						className={`${s.envBtn} ${s.envBtnGhost}`}
						onClick={onClearToken}
					>
						<TrashIcon />
						Очистить токен
					</button>
				)}
				<span className={s.envAuthFootMeta}>
					{accessToken
						? `текущий токен · ${accessToken.slice(0, 24)}${accessToken.length > 24 ? "…" : ""}`
						: "токен не получен"}
				</span>
			</div>
		</Section>
	);
};
