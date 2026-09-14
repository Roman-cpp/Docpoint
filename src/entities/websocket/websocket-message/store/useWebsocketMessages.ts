import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { createWebsocketMessageApi } from "../api/create-websocket-message-api";
import { deleteWebsocketMessageApi } from "../api/delete-websocket-message-api";
import { getWebsocketMessagesApi } from "../api/get-websocket-messages-api";
import { updateWebsocketMessageApi } from "../api/update-websocket-message-api";
import type {
	CreateWebsocketMessageDTO,
	UpdateWebsocketMessageDTO,
} from "../model/websocket-message.dto";
import type { WebsocketMessage } from "../model/websocket-message.type";

export const websocketMessageKeys = {
	all: ["websocket-messages"] as const,
	byWebsocket: (id: string) =>
		[...websocketMessageKeys.all, "websocket", id] as const,
};

/** Shape of a previously exported example-frames file. `websocket` is purely
 *  informational (e.g. shown in a confirmation toast) — imported messages are
 *  always attached to the currently open socket. */
export interface ImportWebsocketMessagesPayload {
	version: number;
	websocket?: { name?: string; url?: string };
	messages: { name: string; desc?: string; payload: string }[];
}

/** Saved example frames for a single WebSocket doc, plus create/update/delete. */
export const useWebsocketMessages = (websocketId: string) => {
	const queryClient = useQueryClient();

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: websocketMessageKeys.byWebsocket(websocketId),
		});

	const messages = useQuery<WebsocketMessage[]>({
		queryKey: websocketMessageKeys.byWebsocket(websocketId),
		queryFn: () => getWebsocketMessagesApi({ websocketId }),
		enabled: !!websocketId,
	});

	const create = useMutation({
		mutationFn: (dto: CreateWebsocketMessageDTO) =>
			createWebsocketMessageApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Сообщение добавлено" });
			invalidate();
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const update = useMutation({
		mutationFn: (dto: UpdateWebsocketMessageDTO) =>
			updateWebsocketMessageApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Сообщение обновлено" });
			invalidate();
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const remove = useMutation({
		mutationFn: (messageId: string) => deleteWebsocketMessageApi({ messageId }),
		onSuccess: () => {
			toast({ title: "OK", description: "Сообщение удалено" });
			invalidate();
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const importMessages = useMutation({
		mutationFn: (payload: ImportWebsocketMessagesPayload) =>
			Promise.all(
				payload.messages.map((m) =>
					createWebsocketMessageApi({
						websocket_id: websocketId,
						name: m.name,
						payload: m.payload,
						desc: m.desc ?? "",
					}),
				),
			),
		onSuccess: (created) => {
			toast({
				title: "OK",
				description: `Импортировано сообщений: ${created.length}`,
			});
			invalidate();
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		messages: messages.data ?? [],
		isMessagesLoading: messages.isLoading,
		isMessagesError: messages.isError,

		createMessage: create.mutate,
		createMessageAsync: create.mutateAsync,
		isCreatingMessage: create.isPending,

		updateMessage: update.mutate,
		updateMessageAsync: update.mutateAsync,
		isUpdatingMessage: update.isPending,

		deleteMessage: remove.mutate,
		deleteMessageAsync: remove.mutateAsync,
		isDeletingMessage: remove.isPending,

		importMessages: importMessages.mutate,
		importMessagesAsync: importMessages.mutateAsync,
		isImportingMessages: importMessages.isPending,
	};
};
