import type { FC } from "react";
import { Toggle } from "@/shared/ui-kit/controls";
import s from "../EnvironmentPage.module.css";
import { Field, Section } from "../parts";

type Props = {
	enabled: boolean;
	onEnabledChange: (value: boolean) => void;
	url: string;
	onUrlChange: (value: string) => void;
	onUrlBlur: () => void;
	username: string;
	onUsernameChange: (value: string) => void;
	onUsernameBlur: () => void;
	password: string;
	onPasswordChange: (value: string) => void;
	onPasswordBlur: () => void;
	bypass: string;
	onBypassChange: (value: string) => void;
	onBypassBlur: () => void;
	insecure: boolean;
	onInsecureChange: (value: boolean) => void;
	/** Секунды в UI; конверсия в миллисекунды — на стороне вызывающего. */
	timeoutSeconds: string;
	onTimeoutSecondsChange: (value: string) => void;
	onTimeoutSecondsBlur: () => void;
	/** Статус автосохранения — «сохраняем…» / «сохранено». */
	pillLabel?: string;
};

export const ProxySection: FC<Props> = ({
	enabled,
	onEnabledChange,
	url,
	onUrlChange,
	onUrlBlur,
	username,
	onUsernameChange,
	onUsernameBlur,
	password,
	onPasswordChange,
	onPasswordBlur,
	bypass,
	onBypassChange,
	onBypassBlur,
	insecure,
	onInsecureChange,
	timeoutSeconds,
	onTimeoutSecondsChange,
	onTimeoutSecondsBlur,
	pillLabel,
}) => (
	<Section
		title="Прокси и сеть"
		sub="HTTP-запросы окружения; WebSocket — всегда напрямую"
		right={
			pillLabel ? (
				<span className={s.envTokenPill}>
					<span className={s.dot} />
					{pillLabel}
				</span>
			) : null
		}
	>
		<Field
			label="Не проверять сертификат"
			help="действует и без прокси — на прямые запросы к этому окружению; нужно самоподписанным сертификатам и отладочным прокси (Charles, Proxyman, mitmproxy)"
		>
			<Toggle
				checked={insecure}
				onChange={(e) => onInsecureChange(e.target.checked)}
			/>
		</Field>
		<Field label="Таймаут запроса" help="секунды; пусто или 0 — без таймаута">
			<input
				className={s.envInput}
				type="number"
				min={0}
				value={timeoutSeconds}
				onChange={(e) => onTimeoutSecondsChange(e.target.value)}
				onBlur={onTimeoutSecondsBlur}
				placeholder="без таймаута"
			/>
		</Field>
		<Field
			label="Прокси включён"
			help="выключенный прокси не применяется, настройки сохраняются"
		>
			<Toggle
				checked={enabled}
				onChange={(e) => onEnabledChange(e.target.checked)}
			/>
		</Field>
		{/* Остальное показываем только включённым: у окружения без прокси это
		    четыре поля, которые никогда не заполняют. */}
		{enabled && (
			<>
				<Field
					label={
						<>
							Адрес<span className={s.req}>*</span>
						</>
					}
					help="без схемы считается http; поддерживаются http, https, socks5"
				>
					<input
						className={s.envInput}
						value={url}
						onChange={(e) => onUrlChange(e.target.value)}
						onBlur={onUrlBlur}
						placeholder="http://127.0.0.1:8080"
					/>
				</Field>
				<Field label="Логин" help="если прокси просит basic-авторизацию">
					<input
						className={s.envInput}
						value={username}
						onChange={(e) => onUsernameChange(e.target.value)}
						onBlur={onUsernameBlur}
						autoComplete="off"
						placeholder="—"
					/>
				</Field>
				<Field label="Пароль">
					<input
						className={s.envInput}
						type="password"
						value={password}
						onChange={(e) => onPasswordChange(e.target.value)}
						onBlur={onPasswordBlur}
						autoComplete="new-password"
						placeholder="—"
					/>
				</Field>
				<Field label="Мимо прокси" help="хосты через запятую">
					<input
						className={s.envInput}
						value={bypass}
						onChange={(e) => onBypassChange(e.target.value)}
						onBlur={onBypassBlur}
						placeholder="localhost, 127.0.0.1, *.internal"
					/>
				</Field>
			</>
		)}
	</Section>
);
