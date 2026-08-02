import { invoke } from "@tauri-apps/api/core";

/** Сбрасывает авторизацию окружения целиком: и токен, и куки сессии. */
export function clearEnvironmentSessionApi(
	environmentId: string,
): Promise<void> {
	return invoke("clear_environment_session", { environmentId });
}
