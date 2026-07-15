import { useQuery } from "@tanstack/react-query";
import type { Doc } from "@/entities/doc-api";
import { readServiceDocsApi } from "../api/readServiceDocsApi";

export const serviceDocsKeys = {
	all: ["service-docs"] as const,
	byService: (id: string) => [...serviceDocsKeys.all, id] as const,
};

/** Docs attached to a single microservice. */
export const useServiceDocs = (serviceId: string) => {
	const docs = useQuery<Doc[]>({
		queryKey: serviceDocsKeys.byService(serviceId),
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
