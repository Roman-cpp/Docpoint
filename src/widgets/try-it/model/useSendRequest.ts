import { useState } from "react";
import type { Doc, Endpoint } from "@/entities/doc-api";
import type { Environment } from "@/entities/environment";
import { sendRequestApi } from "@/entities/request";
import {
	actionUpdateEndpointParamValue,
	useDocApiStore,
} from "@/features/doc-api";
import { actionSetResponse, useResponseStore } from "@/features/request";
import {
	buildBody,
	buildHeaders,
	buildUrl,
	canHaveBody,
	readValue,
} from "../lib/buildRequest";
import { notifyError } from "../lib/notifyError";
import type { RequestDraft } from "./tryIt.types";

/** Значение вида `{{VAR}}` целиком — ссылка на переменную окружения. */
const VAR_REF_RE = /^\{\{(\w+)\}\}$/;

/** Параметры эндпоинта из его схемы — query или body. */
type SchemaParams = Endpoint["queryParams"];

function prettyJson(raw: string): string {
	try {
		return JSON.stringify(JSON.parse(raw), null, 2);
	} catch {
		return raw || "(empty)";
	}
}

interface SendArgs {
	endpoint: Endpoint;
	env: Environment;
	doc: Doc | null;
	request: RequestDraft;
}

/**
 * Тело запроса: в режиме `raw` уходит ровно то, что набрал пользователь,
 * в режиме `fields` — собранное из полей схемы. GET/HEAD тела не имеют.
 */
function resolveBody(
	endpoint: Endpoint,
	env: Environment,
	request: RequestDraft,
): string | null {
	if (request.bodyMode === "fields") {
		return buildBody(endpoint, env, request.values);
	}
	if (!canHaveBody(endpoint.method)) return null;
	const raw = request.rawBody.trim();
	return raw || null;
}

/**
 * Отправка запроса из панели "Try it": закрепляет за параметрами схемы
 * ссылки на переменные окружения, шлёт запрос и кладёт ответ в стор.
 */
export function useSendRequest() {
	const [loading, setLoading] = useState(false);
	const setResponse = useResponseStore(actionSetResponse);
	const updateEndpointParamValue = useDocApiStore(
		actionUpdateEndpointParamValue,
	);

	/**
	 * Если в поле введена голая ссылка `{{VAR}}`, запоминаем её в схеме
	 * эндпоинта — тогда параметр будет подставляться сам в новых наборах.
	 */
	const persistVarRefs = async ({ endpoint, request }: SendArgs) => {
		const values = request.values;
		const tasks: Promise<void>[] = [];

		const collect = (kind: "query" | "body", params: SchemaParams) => {
			for (const param of params) {
				if (param.value) continue;
				const match = readValue(values, kind, param.name)
					.trim()
					.match(VAR_REF_RE);
				if (match) {
					tasks.push(
						updateEndpointParamValue(endpoint.id, kind, param.name, match[1]),
					);
				}
			}
		};

		collect("query", endpoint.queryParams ?? []);
		collect("body", endpoint.bodyParams ?? []);
		await Promise.all(tasks);
	};

	const send = async (args: SendArgs) => {
		const { endpoint, env, doc, request } = args;
		setLoading(true);
		setResponse(null);

		try {
			await persistVarRefs(args);
		} catch (e) {
			notifyError("Не удалось запомнить переменные параметров", e);
		}

		try {
			const body = resolveBody(endpoint, env, request);
			const result = await sendRequestApi({
				method: endpoint.method,
				url: buildUrl(endpoint, env, doc, request.values),
				headers: buildHeaders(request.headers, env, body),
				body,
			});

			setResponse({
				ok: result.status < 300,
				status: result.status,
				statusText: result.status_text,
				dur: result.duration_ms,
				body: prettyJson(result.body),
			});
		} catch (e) {
			setResponse({ error: String(e), dur: 0 });
		}

		setLoading(false);
	};

	return { send, loading };
}
