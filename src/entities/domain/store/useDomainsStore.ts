import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";

import { attachDocApi } from "../api/attach-doc-api";
import { createDomainApi } from "../api/create-domain-api";
import { deleteDomainApi } from "../api/delete-domain-api";
import { getAllDomainsApi } from "../api/get-all-domains-api";
import { getPlatformDomainsApi } from "../api/get-platform-domains-api";
import { updateDomainApi } from "../api/update-domain-api";
import type { CreateDomainDTO, UpdateDomainDTO } from "../model/domain.dto";
import type { Domain } from "../model/domain.entity";

export const domainKeys = {
	all: ["domains"] as const,
	list: () => [...domainKeys.all, "list"] as const,
	byPlatform: (id: string) => [...domainKeys.all, "platform", id] as const,
};

export const useAllDomains = () => {
	const domains = useQuery<Domain[]>({
		queryKey: domainKeys.list(),
		queryFn: () => getAllDomainsApi(),
	});

	return {
		domains: domains.data ?? [],
		isDomainsLoading: domains.isLoading,
		isDomainsFetching: domains.isFetching,
		isDomainsError: domains.isError,
		domainsError: domains.error,
	};
};

/** Attach a doc to a domain. Refreshes both the domain lists and the
 *  per-platform doc lists, since a platform's docs are derived from its
 *  domains. */
export const useAttachDoc = () => {
	const queryClient = useQueryClient();

	const attachDoc = useMutation({
		mutationFn: ({ domainId, docId }: { domainId: string; docId: string }) =>
			attachDocApi(domainId, docId),
		onSuccess: () => {
			toast({ title: "OK", description: "Документ добавлен в домен" });
			queryClient.invalidateQueries({ queryKey: domainKeys.all });
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

export const usePlatformDomains = (platformId: string) => {
	const queryClient = useQueryClient();

	const domains = useQuery<Domain[]>({
		queryKey: domainKeys.byPlatform(platformId),
		queryFn: () => getPlatformDomainsApi(platformId),
		enabled: !!platformId,
	});

	const createDomain = useMutation({
		mutationFn: (dto: CreateDomainDTO) => createDomainApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Домен создан" });
			queryClient.invalidateQueries({
				queryKey: domainKeys.byPlatform(platformId),
			});
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const updateDomain = useMutation({
		mutationFn: (dto: UpdateDomainDTO) => updateDomainApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Домен обновлён" });
			queryClient.invalidateQueries({
				queryKey: domainKeys.byPlatform(platformId),
			});
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	const deleteDomain = useMutation({
		mutationFn: (id: string) => deleteDomainApi(id),
		onSuccess: () => {
			toast({ title: "OK", description: "Домен удалён" });
			queryClient.invalidateQueries({
				queryKey: domainKeys.byPlatform(platformId),
			});
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		domains: domains.data ?? [],
		isDomainsLoading: domains.isLoading,
		isDomainsFetching: domains.isFetching,
		isDomainsError: domains.isError,
		domainsError: domains.error,

		createDomain: createDomain.mutate,
		createDomainAsync: createDomain.mutateAsync,
		isCreatingDomain: createDomain.isPending,

		updateDomain: updateDomain.mutate,
		updateDomainAsync: updateDomain.mutateAsync,
		isUpdatingDomain: updateDomain.isPending,

		deleteDomain: deleteDomain.mutate,
		deleteDomainAsync: deleteDomain.mutateAsync,
		isDeletingDomain: deleteDomain.isPending,
	};
};
