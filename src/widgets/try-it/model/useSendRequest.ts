import { useState } from "react";
import type { Doc, Endpoint, UrlParamKind } from "@/entities/doc-api";
import type { Environment } from "@/entities/environment";
import { type SendRequestResult, sendRequestApi } from "@/entities/request";
import {
	actionUpdateEndpointParamValue,
	useDocApiStore,
} from "@/features/doc-api";
import {
	actionSetResponse,
	type ResponseHeader,
	useResponseStore,
} from "@/features/request";
import {
	buildHeaders,
	buildUrl,
	readValue,
	resolveRequestBody,
} from "../lib/buildRequest";
import { notifyError } from "../lib/notifyError";
import type { RequestDraft } from "./tryIt.types";

/** Значение вида `{{VAR}}` целиком — ссылка на переменную окружения. */
const VAR_REF_RE = /^\{\{(\w+)\}\}$/;

function prettyJson(raw: string): string {
	try {
		return JSON.stringify(JSON.parse(raw), null, 2);
	} catch {
		// Пустую строку отдаём как есть: «ответ без тела» — случай панели, а не
		// повод подменять содержимое заглушкой.
		return raw;
	}
}

/**
 * Заголовки ответа парами. `Set-Cookie` бэкенд отдаёт отдельным списком, иначе
 * в мапе от нескольких кук осталась бы последняя, — возвращаем их построчно.
 */
function responseHeaders(result: SendRequestResult): ResponseHeader[] {
	const rows = Object.entries(result.headers)
		.filter(([key]) => key.toLowerCase() !== "set-cookie")
		.map(([key, value]) => ({ key, value }));

	for (const cookie of result.set_cookies ?? [])
		rows.push({ key: "set-cookie", value: cookie });

	return rows.sort((a, b) => a.key.localeCompare(b.key));
}

interface SendArgs {
	endpoint: Endpoint;
	env: Environment;
	doc: Doc | null;
	request: RequestDraft;
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
	 *
	 * Только URL-параметры: тело набора хранится JSON-документом, и ссылка на
	 * переменную живёт прямо в нём — запоминать её отдельно незачем.
	 */
	const persistVarRefs = async ({ endpoint, request }: SendArgs) => {
		const tasks: Promise<void>[] = [];

		const remember = (kind: UrlParamKind, name: string, text: string) => {
			const match = text.trim().match(VAR_REF_RE);
			if (match) {
				tasks.push(updateEndpointParamValue(endpoint.id, kind, name, match[1]));
			}
		};

		// Только описанные сегменты: запоминать ссылку некуда, если строки
		// параметра в схеме нет.
		for (const param of endpoint.pathParams ?? []) {
			if (param.value) continue;
			remember(
				"path",
				param.name,
				readValue(request.values, "path", param.name),
			);
		}

		for (const param of endpoint.queryParams ?? []) {
			if (param.value) continue;
			remember(
				"query",
				param.name,
				readValue(request.values, "query", param.name),
			);
		}

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
			const body = resolveRequestBody(endpoint, env, request.body);
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
				headers: responseHeaders(result),
			});
		} catch (e) {
			setResponse({ error: String(e), dur: 0 });
		}

		setLoading(false);
	};

	return { send, loading };
}
