import { invoke } from "@tauri-apps/api/core";
import type { Endpoint, EndpointRequest, Group } from "@/entities/doc-api";
import {
	getDocApi,
	getEndpointRequestsApi,
	getGroupsApi,
} from "@/entities/doc-api";

/**
 * Тело в файле — настоящий JSON-объект, а не строка с экранированными
 * кавычками: файл читают и правят руками. Тело, которое JSON не является
 * (форма, XML, текст), остаётся строкой — другого способа его записать нет.
 */
function asDocument(body: string): unknown {
	try {
		return JSON.parse(body);
	} catch {
		return body;
	}
}

/**
 * Набор «Try it» в файле: значения частей запроса, каждая под своим именем.
 * `id`, `endpointId` и `sortOrd` не пишем — импорт их не читает, порядок берёт
 * из позиции в массиве, а идентификаторы заводит заново.
 */
function requestForFile(request: EndpointRequest) {
	const values = (kind: "path" | "query") =>
		Object.fromEntries(
			request.values
				.filter((value) => value.kind === kind)
				.map((value) => [value.name, value.value]),
		);

	const path = values("path");
	const query = values("query");

	return {
		name: request.name,
		bodyMode: request.bodyMode,
		body: request.body ? asDocument(request.body) : undefined,
		headers: request.headers.length > 0 ? request.headers : undefined,
		cookies: request.cookies?.length ? request.cookies : undefined,
		path: Object.keys(path).length > 0 ? path : undefined,
		query: Object.keys(query).length > 0 ? query : undefined,
	};
}

/** Эндпоинт для файла: пустые секции в него не попадают. */
function endpointForFile(endpoint: Endpoint, requests: EndpointRequest[]) {
	return {
		...endpoint,
		body: endpoint.body ? asDocument(endpoint.body) : undefined,
		bodyFields: endpoint.bodyFields?.length ? endpoint.bodyFields : undefined,
		requests: requests.length > 0 ? requests.map(requestForFile) : undefined,
	};
}

/** Собирает документ со всеми связанными данными и сохраняет его как JSON-файл
 *  в том же формате, что принимает importDocApi (ImportDocPayload). */
export async function exportDoc(docId: string, docName: string): Promise<void> {
	const [doc, groups] = await Promise.all([
		getDocApi({ id: docId }),
		getGroupsApi({ docId }),
	]);

	// Наборы «Try it» лежат отдельно от описания: чтение групп их не отдаёт, а
	// в файле они нужны — иначе экспорт и импорт того же файла теряли бы всё,
	// что настроено в панели.
	const forExport = await Promise.all(
		(groups ?? []).map(async (group: Group) => ({
			...group,
			endpoints: await Promise.all(
				group.endpoints.map(async (endpoint) =>
					endpointForFile(
						endpoint,
						await getEndpointRequestsApi({ endpointId: endpoint.id }),
					),
				),
			),
		})),
	);

	const content = JSON.stringify({ doc, groups: forExport }, null, 2);
	const filename = `${docName.replace(/\s+/g, "_")}.json`;
	await invoke("save_json_file", { content, filename });
}
