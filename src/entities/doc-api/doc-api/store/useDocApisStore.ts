import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { getAllDocsApi } from "../api/get-all-docs-api";
import { getDocApi } from "../api/get-doc-api";
import { updateDocApi } from "../api/update-doc-api";
import type { UpdateDocDTO } from "../model/doc-api.dto";
import type { Doc } from "../model/doc-api.entity";

export const docKeys = {
	all: ["docs"] as const,
	lists: () => [...docKeys.all, "list"] as const,
	list: () => [...docKeys.lists()] as const,
	details: () => [...docKeys.all, "detail"] as const,
	detail: (id: string) => [...docKeys.details(), id] as const,
};

export interface UseDocsStoreParams {
	id?: string;
}

export const useDocsStore = ({ id }: UseDocsStoreParams = {}) => {
	const queryClient = useQueryClient();

	const docs = useQuery<Doc[]>({
		queryKey: docKeys.list(),
		queryFn: () => getAllDocsApi(),
	});

	const doc = useQuery<Doc | null>({
		queryKey: docKeys.detail(id ?? ""),
		queryFn: () => getDocApi(id ?? ""),
		enabled: Boolean(id),
	});

	const updateDoc = useMutation({
		mutationFn: (dto: UpdateDocDTO) => updateDocApi(dto),
		onSuccess: (_data, dto) => {
			toast({ title: "OK", description: "Документ обновлён" });
			queryClient.invalidateQueries({ queryKey: docKeys.detail(dto.id) });
			queryClient.invalidateQueries({ queryKey: docKeys.lists() });
		},
		onError: (error: Error) => {
			toast({
				title: "Ошибка",
				description: error.message,
				variant: "error",
			});
		},
	});

	return {
		docs: docs.data ?? [],
		doc: doc.data ?? null,

		isDocsLoading: docs.isLoading,
		isDocsFetching: docs.isFetching,
		isDocsError: docs.isError,
		docsError: docs.error,

		isDocLoading: doc.isLoading,
		isDocFetching: doc.isFetching,
		isDocError: doc.isError,
		docError: doc.error,

		updateDoc: updateDoc.mutate,
		updateDocAsync: updateDoc.mutateAsync,

		isUpdating: updateDoc.isPending,
	};
};
