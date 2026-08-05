import { useQuery } from "@tanstack/react-query";
import type { Doc } from "@/entities/doc-api";
import { readDomainDocsApi } from "../api/readDomainDocsApi";

export const domainDocsKeys = {
	all: ["domain-docs"] as const,
	byDomain: (id: string) => [...domainDocsKeys.all, id] as const,
};

/** Docs attached to a single domain. */
export const useDomainDocs = (domainId: string) => {
	const docs = useQuery<Doc[]>({
		queryKey: domainDocsKeys.byDomain(domainId),
		queryFn: () => readDomainDocsApi(domainId),
		enabled: !!domainId,
	});

	return {
		docs: docs.data ?? [],
		isDocsLoading: docs.isLoading,
		isDocsFetching: docs.isFetching,
		isDocsError: docs.isError,
		docsError: docs.error,
	};
};
