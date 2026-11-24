import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { type CreateNodeDTO, catalogKeys } from "@/entities/catalog";
import { docWebsocketKeys, websocketMessageKeys } from "@/entities/websocket";
import {
	type ImportWebsocketReport,
	importWebsocketApi,
} from "../api/importWebsocketApi";
import type { ImportWebsocketPayload } from "../lib/parseWebsocketImport";

/** Куда положить импортируемый сокет. */
export interface ImportWebsocketTarget {
	platformId: string;
	parentId: string | null;
}

/** Отчёт словами: сокет выбирает файл, а не пользователь, поэтому в тосте он
 *  назван по имени — так сразу видно, если файл прилетел не туда. */
const describe = (report: ImportWebsocketReport): string => {
	const changes = [
		report.messagesAdded && `добавлено сообщений: ${report.messagesAdded}`,
		report.messagesUpdated && `обновлено: ${report.messagesUpdated}`,
	].filter(Boolean);

	const what =
		changes.length > 0 ? changes.join(", ") : "сообщений в файле нет";

	return `«${report.docName}» — ${what}`;
};

/**
 * Импорт WebSocket-документа в открытый каталог.
 *
 * Сокет выбирает сам файл — по своему `id`: нет такого сокета, он создаётся в
 * открытом каталоге; есть — файл дописывается в него.
 */
export const useImportWebsocket = (target: ImportWebsocketTarget) => {
	const queryClient = useQueryClient();

	const importWebsocket = useMutation({
		mutationFn: (payload: ImportWebsocketPayload) => {
			const node: CreateNodeDTO = {
				id: payload.websocket.id ?? null,
				platformId: target.platformId,
				parentId: target.parentId,
				name: payload.websocket.name,
				payload: { kind: "docWs", url: payload.websocket.url },
			};

			return importWebsocketApi(
				node,
				payload.messages.map((message) => ({
					name: message.name,
					payload: message.payload,
					desc: message.desc ?? "",
				})),
			);
		},
		onSuccess: (report) => {
			toast({
				title: report.created ? "Сокет создан" : "Сокет обновлён",
				description: describe(report),
			});
			queryClient.invalidateQueries({ queryKey: catalogKeys.all });
			queryClient.invalidateQueries({ queryKey: docWebsocketKeys.all });
			queryClient.invalidateQueries({ queryKey: websocketMessageKeys.all });
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		importWebsocket: importWebsocket.mutate,
		importWebsocketAsync: importWebsocket.mutateAsync,
		isImportingWebsocket: importWebsocket.isPending,
	};
};
