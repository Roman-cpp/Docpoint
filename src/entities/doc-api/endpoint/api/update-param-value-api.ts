import { invoke } from "@tauri-apps/api/core";
import type { EndpointParamKind } from "../model/endpoint.type";

interface UpdateParamValueParams {
	endpointId: string;
	kind: EndpointParamKind;
	name: string;
	value: string;
}

/**
 * Запоминает за параметром переменную окружения, выбранную в «Try it».
 *
 * Значение — не часть описания параметра, поэтому оно и правится отдельной
 * командой: панель запоминает выбор пользователя, не пересылая весь эндпоинт.
 */
export function updateParamValueApi({
	endpointId,
	kind,
	name,
	value,
}: UpdateParamValueParams): Promise<void> {
	return invoke("update_param_value", { endpointId, kind, name, value });
}
