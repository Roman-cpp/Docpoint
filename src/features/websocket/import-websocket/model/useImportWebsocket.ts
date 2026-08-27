import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { catalogKeys, createNodeApi } from "@/entities/catalog";
import {
	createWebsocketMessageApi,
	docWebsocketKeys,
} from "@/entities/websocket";
import type { ImportWebsocketPayload } from "../lib/parseWebsocketImport";

/** Куда положить импортируемый сокет. */
export interface ImportWebsocketTarget {
	platformId: string;
	parentId: string | null;
}

/**
 * Импорт WebSocket-документа в открытый каталог: заводит узел дерева и заливает
 * в него примеры сообщений из файла.
 */
export const useImportWebsocket = (target: ImportWebsocketTarget) => {
	const queryClient = useQueryClient();

	const importWebsocket = useMutation({
		mutationFn: async (payload: ImportWebsocketPayload) => {
			const node = await createNodeApi({
				platformId: target.platformId,
				parentId: target.parentId,
				name: payload.websocket.name,
				desc: payload.websocket.desc ?? "",
				payload: { kind: "docWs", url: payload.websocket.url },
			});

			// Массовой команды у бэкенда нет — сообщения создаются по одному.
			// Порядок вставки не важен: список читается `ORDER BY name`.
			await Promise.all(
				payload.messages.map((message) =>
					createWebsocketMessageApi({
						websocket_id: node.id,
						name: message.name,
						payload: message.payload,
						desc: message.desc ?? "",
					}),
				),
			);

			return { websocketId: node.id, imported: payload.messages.length };
		},
		onSuccess: ({ imported }) => {
			toast({
				title: "OK",
				description: `WebSocket импортирован, сообщений: ${imported}`,
			});
			queryClient.invalidateQueries({ queryKey: docWebsocketKeys.all });
			queryClient.invalidateQueries({ queryKey: catalogKeys.all });
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
