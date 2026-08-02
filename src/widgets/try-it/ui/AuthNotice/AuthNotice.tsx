import { type FC, useEffect, useState } from "react";
import { getEnvironmentAuthApi } from "@/entities/environment";
import {
	actionUpdateEnvironmentToken,
	useEnvironmentsStore,
} from "@/features/environment";
import { notifyError } from "../../lib/notifyError";
import s from "./AuthNotice.module.css";

interface AuthNoticeProps {
	/** Окружение, чью авторизацию показываем и правим. */
	environmentId: string;
}

/**
 * Статус авторизации для эндпоинта с `auth: true`: показывает, авторизовано ли
 * текущее окружение, и позволяет задать или сбросить токен на месте.
 *
 * Окружение может авторизоваться и куками сессии — тогда токена нет вовсе, и
 * править тут нечего: куки выдаёт сервер по кнопке «Авторизоваться».
 */
export const AuthNotice: FC<AuthNoticeProps> = ({ environmentId }) => {
	const updateToken = useEnvironmentsStore(actionUpdateEnvironmentToken);
	const [token, setToken] = useState("");
	const [cookieCount, setCookieCount] = useState(0);
	const [byCookies, setByCookies] = useState(false);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");

	useEffect(() => {
		let active = true;
		setEditing(false);
		getEnvironmentAuthApi(environmentId)
			.then((auth) => {
				if (!active) return;
				setToken(auth.accessToken ?? "");
				setByCookies(auth.tokenPlacement === "cookie");
				setCookieCount(Object.keys(auth.authCookies ?? {}).length);
			})
			.catch((e) => {
				notifyError("Не удалось загрузить авторизацию окружения", e);
				if (!active) return;
				setToken("");
				setByCookies(false);
				setCookieCount(0);
			});
		return () => {
			active = false;
		};
	}, [environmentId]);

	const save = (e: React.FormEvent) => {
		e.preventDefault();
		const next = draft.trim();
		if (!next) return;
		updateToken(next);
		setToken(next);
		setEditing(false);
		setDraft("");
	};

	const clear = () => {
		updateToken(null);
		setToken("");
		setEditing(false);
	};

	if (byCookies) {
		const ok = cookieCount > 0;
		return (
			<div className={`${s.authNotice}${ok ? ` ${s.ok}` : ""}`}>
				<span className={s.authNoticeIcon}>{ok ? "🍪" : "🔒"}</span>
				<span className={s.authNoticeTxt}>
					{ok
						? `Authorized by ${cookieCount} session cookie${cookieCount > 1 ? "s" : ""}`
						: "Окружение авторизуется куками — нажмите «Авторизоваться» в разделе Environments"}
				</span>
			</div>
		);
	}

	return (
		<div className={`${s.authNotice}${token ? ` ${s.ok}` : ""}`}>
			<span className={s.authNoticeIcon}>{token ? "🔑" : "🔒"}</span>
			<span className={s.authNoticeTxt}>
				{token ? "Authorized" : "This endpoint requires a Bearer token"}
			</span>

			{token ? (
				<button type="button" className={s.authNoticeBtn} onClick={clear}>
					Clear
				</button>
			) : editing ? (
				<form className={s.authNoticeForm} onSubmit={save}>
					<input
						ref={(el) => el?.focus()}
						className={s.authNoticeInput}
						placeholder="Bearer token…"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
					/>
					<button className={s.authNoticeBtn} type="submit">
						Save
					</button>
					<button
						className={s.authNoticeBtn}
						type="button"
						onClick={() => {
							setEditing(false);
							setDraft("");
						}}
					>
						Cancel
					</button>
				</form>
			) : (
				<button
					type="button"
					className={s.authNoticeBtn}
					onClick={() => setEditing(true)}
				>
					Set token
				</button>
			)}
		</div>
	);
};
