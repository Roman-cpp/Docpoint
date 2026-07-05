import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { createWebsocketApi } from "../api/createWebsocketApi";
import { readServiceWebsocketsApi } from "../api/readServiceWebsocketsApi";
import type { CreateDocWebsocketDTO, DocWebsocket } from "../model/type";

export const docWebsocketKeys = {
	all: ["doc-websockets"] as const,
	byService: (id: string) => [...docWebsocketKeys.all, "service", id] as const,
};

/** WebSocket docs attached to a single microservice, plus a create mutation. */
export const useServiceWebsockets = (serviceId: string) => {
	const queryClient = useQueryClient();

	const websockets = useQuery<DocWebsocket[]>({
		queryKey: docWebsocketKeys.byService(serviceId),
		queryFn: () => readServiceWebsocketsApi(serviceId),
		enabled: !!serviceId,
	});

	const create = useMutation({
		mutationFn: (dto: CreateDocWebsocketDTO) => createWebsocketApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "WebSocket создан" });
			queryClient.invalidateQueries({
				queryKey: docWebsocketKeys.byService(serviceId),
			});
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		websockets: websockets.data ?? [],
		isWebsocketsLoading: websockets.isLoading,
		isWebsocketsError: websockets.isError,

		createWebsocket: create.mutate,
		createWebsocketAsync: create.mutateAsync,
		isCreatingWebsocket: create.isPending,
	};
};
