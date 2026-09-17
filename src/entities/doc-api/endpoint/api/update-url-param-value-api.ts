import { invoke } from "@tauri-apps/api/core";
import type { UrlParamKind } from "../model/endpoint.type";

interface UpdateUrlParamValueParams {
	endpointId: string;
	kind: UrlParamKind;
	name: string;
	value: string;
}

/**
 * Запоминает за URL-параметром переменную окружения, выбранную в «Try it».
 *
 * Значение — не часть описания параметра, поэтому оно и правится отдельной
 * командой: панель запоминает выбор пользователя, не пересылая весь эндпоинт.
 */
export function updateUrlParamValueApi({
	endpointId,
	kind,
	name,
	value,
}: UpdateUrlParamValueParams): Promise<void> {
	return invoke("update_url_param_value", { endpointId, kind, name, value });
}
