import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { createErdApi } from "../api/create-erd-api";
import { readServiceErdsApi } from "../api/read-service-erds-api";
import type { CreateDocErdDTO } from "../model/doc-erd.dto";
import type { DocErd } from "../model/doc-erd.entity";

export const docErdKeys = {
	all: ["doc-erds"] as const,
	byService: (id: string) => [...docErdKeys.all, "service", id] as const,
};

/** ERD diagrams attached to a single microservice, plus a create mutation. */
export const useServiceErds = (serviceId: string) => {
	const queryClient = useQueryClient();

	const erds = useQuery<DocErd[]>({
		queryKey: docErdKeys.byService(serviceId),
		queryFn: () => readServiceErdsApi(serviceId),
		enabled: !!serviceId,
	});

	const create = useMutation({
		mutationFn: (dto: CreateDocErdDTO) => createErdApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "ERD-диаграмма создана" });
			queryClient.invalidateQueries({
				queryKey: docErdKeys.byService(serviceId),
			});
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		erds: erds.data ?? [],
		isErdsLoading: erds.isLoading,
		isErdsError: erds.isError,

		createErd: create.mutate,
		createErdAsync: create.mutateAsync,
		isCreatingErd: create.isPending,
	};
};
