import { type FC, useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { describeError, log } from "../../lib/log";
import s from "./RouteError.module.css";

/**
 * Граница ошибок корневого маршрута: исключение при рендере любой страницы
 * попадает сюда, а не в белый экран. Ошибка пишется в лог один раз при
 * появлении, пользователю показывается текст и кнопка перезагрузки.
 */
export const RouteError: FC = () => {
	const error = useRouteError();

	useEffect(() => {
		log.error("ошибка рендера страницы", error);
	}, [error]);

	const details = isRouteErrorResponse(error)
		? `${error.status} ${error.statusText}`
		: describeError(error);

	return (
		<div className={s.screen}>
			<div className={s.card}>
				<h1 className={s.title}>Что-то пошло не так</h1>
				<p className={s.hint}>
					Страница не смогла отрисоваться. Подробности записаны в лог
					приложения.
				</p>
				<pre className={s.details}>{details}</pre>
				<button
					type="button"
					className={s.reload}
					onClick={() => window.location.reload()}
				>
					Перезагрузить
				</button>
			</div>
		</div>
	);
};
