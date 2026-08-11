import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import {
	createWebsocketApi,
	createWebsocketMessageApi,
	docWebsocketKeys,
} from "@/entities/websocket";
import type { ImportWebsocketPayload } from "../lib/parseWebsocketImport";

/**
 * Импорт WebSocket-документа в домен: создаёт сокет и заливает в него примеры
 * сообщений из файла.
 */
export const useImportWebsocket = (domainId: string) => {
	const queryClient = useQueryClient();

	const importWebsocket = useMutation({
		mutationFn: async (payload: ImportWebsocketPayload) => {
			const websocketId = await createWebsocketApi({
				name: payload.websocket.name,
				desc: payload.websocket.desc ?? "",
				url: payload.websocket.url,
				domain_id: domainId,
			});

			// Массовой команды у бэкенда нет — сообщения создаются по одному.
			// Порядок вставки не важен: список читается `ORDER BY name`.
			await Promise.all(
				payload.messages.map((message) =>
					createWebsocketMessageApi({
						websocket_id: websocketId,
						name: message.name,
						payload: message.payload,
						desc: message.desc ?? "",
					}),
				),
			);

			return { websocketId, imported: payload.messages.length };
		},
		onSuccess: ({ imported }) => {
			toast({
				title: "OK",
				description: `WebSocket импортирован, сообщений: ${imported}`,
			});
			// `byDomain` лежит под префиксом `all` — инвалидации корня хватает,
			// чтобы обновились и список домена, и общий список сокетов.
			queryClient.invalidateQueries({ queryKey: docWebsocketKeys.all });
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
