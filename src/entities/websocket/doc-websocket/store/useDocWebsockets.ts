import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { getWebsocketApi } from "../api/get-websocket-api";
import { getWebsocketsApi } from "../api/get-websockets-api";
import { updateWebsocketApi } from "../api/update-websocket-api";
import type { UpdateDocWebsocketDTO } from "../model/doc-websocket.dto";
import type { DocWebsocket } from "../model/doc-websocket.entity";

export const docWebsocketKeys = {
	all: ["doc-websockets"] as const,
	list: () => [...docWebsocketKeys.all, "list"] as const,
	detail: (id: string) => [...docWebsocketKeys.all, "detail", id] as const,
};

/** Все документированные сокеты — список для ws-клиента. */
export const useDocWebsockets = () => {
	const websockets = useQuery<DocWebsocket[]>({
		queryKey: docWebsocketKeys.list(),
		queryFn: getWebsocketsApi,
	});

	return {
		websockets: websockets.data ?? [],
		isWebsocketsLoading: websockets.isLoading,
		isWebsocketsError: websockets.isError,
	};
};

/** Один сокет вместе с правкой его имени, описания и адреса. */
export const useDocWebsocket = (websocketId: string) => {
	const queryClient = useQueryClient();

	const websocket = useQuery<DocWebsocket | null>({
		queryKey: docWebsocketKeys.detail(websocketId),
		queryFn: () => getWebsocketApi(websocketId),
		enabled: !!websocketId,
	});

	const update = useMutation({
		mutationFn: (dto: UpdateDocWebsocketDTO) => updateWebsocketApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "WebSocket обновлён" });
			// Имя сокета лежит в дереве — обновить нужно и его.
			queryClient.invalidateQueries({ queryKey: docWebsocketKeys.all });
			queryClient.invalidateQueries({ queryKey: ["catalog"] });
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		websocket: websocket.data ?? null,
		isWebsocketLoading: websocket.isLoading,
		isWebsocketError: websocket.isError,

		updateWebsocket: update.mutate,
		updateWebsocketAsync: update.mutateAsync,
		isUpdatingWebsocket: update.isPending,
	};
};
