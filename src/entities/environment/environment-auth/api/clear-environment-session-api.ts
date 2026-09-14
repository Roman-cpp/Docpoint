import { invoke } from "@tauri-apps/api/core";

interface ClearEnvironmentSessionParams {
	environmentId: string;
}

/** Сбрасывает авторизацию окружения целиком: и токен, и куки сессии. */
export function clearEnvironmentSessionApi({
	environmentId,
}: ClearEnvironmentSessionParams): Promise<void> {
	return invoke("clear_environment_session", { environmentId });
}
