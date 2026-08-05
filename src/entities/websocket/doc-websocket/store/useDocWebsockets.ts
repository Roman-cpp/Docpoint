import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { createWebsocketApi } from "../api/create-websocket-api";
import { getDomainWebsocketsApi } from "../api/get-domain-websockets-api";
import { updateWebsocketApi } from "../api/update-websocket-api";
import type {
	CreateDocWebsocketDTO,
	UpdateDocWebsocketDTO,
} from "../model/doc-websocket.dto";
import type { DocWebsocket } from "../model/doc-websocket.entity";

export const docWebsocketKeys = {
	all: ["doc-websockets"] as const,
	byDomain: (id: string) => [...docWebsocketKeys.all, "domain", id] as const,
};

/** WebSocket docs attached to a single domain, plus a create mutation. */
export const useDomainWebsockets = (domainId: string) => {
	const queryClient = useQueryClient();

	const websockets = useQuery<DocWebsocket[]>({
		queryKey: docWebsocketKeys.byDomain(domainId),
		queryFn: () => getDomainWebsocketsApi(domainId),
		enabled: !!domainId,
	});

	const create = useMutation({
		mutationFn: (dto: CreateDocWebsocketDTO) => createWebsocketApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "WebSocket создан" });
			queryClient.invalidateQueries({
				queryKey: docWebsocketKeys.byDomain(domainId),
			});
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const update = useMutation({
		mutationFn: (dto: UpdateDocWebsocketDTO) => updateWebsocketApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "WebSocket обновлён" });
			queryClient.invalidateQueries({
				queryKey: docWebsocketKeys.byDomain(domainId),
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

		updateWebsocket: update.mutate,
		updateWebsocketAsync: update.mutateAsync,
		isUpdatingWebsocket: update.isPending,
	};
};
