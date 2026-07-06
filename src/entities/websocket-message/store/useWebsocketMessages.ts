import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { createWebsocketMessageApi } from "../api/createWebsocketMessageApi";
import { deleteWebsocketMessageApi } from "../api/deleteWebsocketMessageApi";
import { readWebsocketMessagesApi } from "../api/readWebsocketMessagesApi";
import { updateWebsocketMessageApi } from "../api/updateWebsocketMessageApi";
import type {
	CreateWebsocketMessageDTO,
	UpdateWebsocketMessageDTO,
	WebsocketMessage,
} from "../model/type";

export const websocketMessageKeys = {
	all: ["websocket-messages"] as const,
	byWebsocket: (id: string) =>
		[...websocketMessageKeys.all, "websocket", id] as const,
};

/** Saved example frames for a single WebSocket doc, plus create/update/delete. */
export const useWebsocketMessages = (websocketId: string) => {
	const queryClient = useQueryClient();

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: websocketMessageKeys.byWebsocket(websocketId),
		});

	const messages = useQuery<WebsocketMessage[]>({
		queryKey: websocketMessageKeys.byWebsocket(websocketId),
		queryFn: () => readWebsocketMessagesApi(websocketId),
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
		mutationFn: (messageId: string) => deleteWebsocketMessageApi(messageId),
		onSuccess: () => {
			toast({ title: "OK", description: "Сообщение удалено" });
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
	};
};
