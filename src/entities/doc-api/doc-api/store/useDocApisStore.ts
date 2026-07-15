import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";

import { deleteDocApi } from "../api/delete-doc-api";
import { readAllDocsApi } from "../api/read-all-docs-api";
import { readDocApi } from "../api/read-doc-api";
import { updateDocApi } from "../api/update-doc-api";
import { writeDocApi } from "../api/write-doc-api";
import type { CreateDocDTO, UpdateDocDTO } from "../model/doc-api.dto";
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
		queryFn: () => readAllDocsApi(),
	});

	const doc = useQuery<Doc | null>({
		queryKey: docKeys.detail(id ?? ""),
		queryFn: () => readDocApi(id!),
		enabled: Boolean(id),
	});

	const createDoc = useMutation({
		mutationFn: (dto: CreateDocDTO) => writeDocApi(dto),
		onSuccess: () => {
			toast({ title: "OK", description: "Документ создан" });
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

	const deleteDoc = useMutation({
		mutationFn: (deletedId: string) => deleteDocApi(deletedId),
		onSuccess: (_data, deletedId) => {
			toast({ title: "OK", description: "Документ удалён" });
			queryClient.removeQueries({ queryKey: docKeys.detail(deletedId) });
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

		createDoc: createDoc.mutate,
		createDocAsync: createDoc.mutateAsync,
		updateDoc: updateDoc.mutate,
		updateDocAsync: updateDoc.mutateAsync,
		deleteDoc: deleteDoc.mutate,
		deleteDocAsync: deleteDoc.mutateAsync,

		isCreating: createDoc.isPending,
		isUpdating: updateDoc.isPending,
		isDeleting: deleteDoc.isPending,
	};
};
