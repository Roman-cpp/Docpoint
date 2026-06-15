import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import type { Doc } from "@/entities/doc";

import { attachDocApi } from "../api/attachDocApi";
import { createServiceApi } from "../api/createServiceApi";
import { deleteServiceApi } from "../api/deleteServiceApi";
import { readAllServicesApi } from "../api/readAllServicesApi";
import { readPlatformServicesApi } from "../api/readPlatformServicesApi";
import { readServiceDocsApi } from "../api/readServiceDocsApi";
import { updateServiceApi } from "../api/updateServiceApi";
import type { CreateServiceDTO, UpdateServiceDTO } from "../model/service.dto";
import type { Service } from "../model/service.type";

export const serviceKeys = {
	all: ["services"] as const,
	list: () => [...serviceKeys.all, "list"] as const,
	byPlatform: (id: string) => [...serviceKeys.all, "platform", id] as const,
	docs: (id: string) => [...serviceKeys.all, "docs", id] as const,
};

/** Docs attached to a single microservice. */
export const useServiceDocs = (serviceId: string) => {
	const docs = useQuery<Doc[]>({
		queryKey: serviceKeys.docs(serviceId),
		queryFn: () => readServiceDocsApi(serviceId),
		enabled: !!serviceId,
	});

	return {
		docs: docs.data ?? [],
		isDocsLoading: docs.isLoading,
		isDocsFetching: docs.isFetching,
		isDocsError: docs.isError,
		docsError: docs.error,
	};
};

export const useAllServices = () => {
	const services = useQuery<Service[]>({
		queryKey: serviceKeys.list(),
		queryFn: () => readAllServicesApi(),
	});

	return {
		services: services.data ?? [],
		isServicesLoading: services.isLoading,
		isServicesFetching: services.isFetching,
		isServicesError: services.isError,
		servicesError: services.error,
	};
};

/** Attach a doc to a microservice. Refreshes both the service lists and the
 *  per-platform doc lists, since a platform's docs are derived from its
 *  services. */
export const useAttachDoc = () => {
	const queryClient = useQueryClient();

	const attachDoc = useMutation({
		mutationFn: ({ serviceId, docId }: { serviceId: string; docId: string }) =>
			attachDocApi(serviceId, docId),
		onSuccess: () => {
			toast({ title: "OK", description: "Документ добавлен в микросервис" });
			queryClient.invalidateQueries({ queryKey: serviceKeys.all });
			queryClient.invalidateQueries({ queryKey: ["platforms"] });
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		attachDoc: attachDoc.mutate,
		attachDocAsync: attachDoc.mutateAsync,
		isAttaching: attachDoc.isPending,
	};
};

export const usePlatformServices = (platformId: string) => {
	const queryClient = useQueryClient();

	const services = useQuery<Service[]>({
		queryKey: serviceKeys.byPlatform(platformId),
		queryFn: () => readPlatformServicesApi(platformId),
		enabled: !!platformId,
	});

	const createService = useMutation({
		mutationFn: (dto: CreateServiceDTO) => createServiceApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Микросервис создан" });
			queryClient.invalidateQueries({
				queryKey: serviceKeys.byPlatform(platformId),
			});
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const updateService = useMutation({
		mutationFn: (dto: UpdateServiceDTO) => updateServiceApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Микросервис обновлён" });
			queryClient.invalidateQueries({
				queryKey: serviceKeys.byPlatform(platformId),
			});
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const deleteService = useMutation({
		mutationFn: (id: string) => deleteServiceApi(id),
		onSuccess: () => {
			toast({ title: "OK", description: "Микросервис удалён" });
			queryClient.invalidateQueries({
				queryKey: serviceKeys.byPlatform(platformId),
			});
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		services: services.data ?? [],
		isServicesLoading: services.isLoading,
		isServicesFetching: services.isFetching,
		isServicesError: services.isError,
		servicesError: services.error,

		createService: createService.mutate,
		createServiceAsync: createService.mutateAsync,
		isCreatingService: createService.isPending,

		updateService: updateService.mutate,
		updateServiceAsync: updateService.mutateAsync,
		isUpdatingService: updateService.isPending,

		deleteService: deleteService.mutate,
		deleteServiceAsync: deleteService.mutateAsync,
		isDeletingService: deleteService.isPending,
	};
};
