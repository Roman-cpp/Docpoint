import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { createErdApi } from "../api/create-erd-api";
import { getDomainErdsApi } from "../api/get-domain-erds-api";
import type { CreateDocErdDTO } from "../model/doc-erd.dto";
import type { DocErd } from "../model/doc-erd.entity";

export const docErdKeys = {
	all: ["doc-erds"] as const,
	byDomain: (id: string) => [...docErdKeys.all, "domain", id] as const,
};

/** ERD diagrams attached to a single domain, plus a create mutation. */
export const useDomainErds = (domainId: string) => {
	const queryClient = useQueryClient();

	const erds = useQuery<DocErd[]>({
		queryKey: docErdKeys.byDomain(domainId),
		queryFn: () => getDomainErdsApi(domainId),
		enabled: !!domainId,
	});

	const create = useMutation({
		mutationFn: (dto: CreateDocErdDTO) => createErdApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "ERD-диаграмма создана" });
			queryClient.invalidateQueries({
				queryKey: docErdKeys.byDomain(domainId),
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
