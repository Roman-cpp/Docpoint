import { type FC, useEffect, useState } from "react";
import { getEnvironmentAccessTokenApi } from "@/entities/environment";
import {
	actionUpdateEnvironmentToken,
	useEnvironmentsStore,
} from "@/features/environment";
import { notifyError } from "../../lib/notifyError";
import s from "./AuthNotice.module.css";

interface AuthNoticeProps {
	/** Окружение, чей токен показываем и правим. */
	environmentId: string;
}

/**
 * Статус авторизации для эндпоинта с `auth: true`: показывает, есть ли токен
 * у текущего окружения, и позволяет задать или сбросить его на месте.
 */
export const AuthNotice: FC<AuthNoticeProps> = ({ environmentId }) => {
	const updateToken = useEnvironmentsStore(actionUpdateEnvironmentToken);
	const [token, setToken] = useState("");
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");

	useEffect(() => {
		let active = true;
		setEditing(false);
		getEnvironmentAccessTokenApi(environmentId)
			.then((loaded) => {
				if (active) setToken(loaded ?? "");
			})
			.catch((e) => {
				notifyError("Не удалось загрузить токен окружения", e);
				if (active) setToken("");
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
