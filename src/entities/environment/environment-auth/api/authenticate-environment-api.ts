import { invoke } from "@tauri-apps/api/core";
import type { EnvironmentAuth } from "../model/environment-auth.type";

interface AuthenticateEnvironmentParams {
	environmentId: string;
}

/**
 * Выполняет запрос авторизации окружения и сохраняет всё, что тот выдал: токен
 * из тела и куки из `Set-Cookie`. Возвращает обновлённую авторизацию либо
 * `null`, если сервер не дал ни токена, ни кук.
 */
export function authenticateEnvironmentApi({
	environmentId,
}: AuthenticateEnvironmentParams): Promise<EnvironmentAuth | null> {
	return invoke("authenticate_environment", { environmentId });
}
