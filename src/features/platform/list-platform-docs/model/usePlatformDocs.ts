import { useQuery } from "@tanstack/react-query";
import type { Doc } from "@/entities/doc-api";
import { readPlatformDocsApi } from "../api/readPlatformDocsApi";

export const platformDocsKeys = {
	all: ["platform-docs"] as const,
	byPlatform: (id: string) => [...platformDocsKeys.all, id] as const,
};

export const usePlatformDocs = (platformId: string) => {
	const docs = useQuery<Doc[]>({
		queryKey: platformDocsKeys.byPlatform(platformId),
		queryFn: () => readPlatformDocsApi(platformId),
		enabled: !!platformId,
	});

	return {
		docs: docs.data ?? [],
		isDocsLoading: docs.isLoading,
		isDocsFetching: docs.isFetching,
		isDocsError: docs.isError,
		docsError: docs.error,
	};
};
