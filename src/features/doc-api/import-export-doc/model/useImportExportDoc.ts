import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { docKeys } from "@/entities/doc-api";
import { importDocApi } from "../api/importDocApi";

export const useImportExportDoc = () => {
	const queryClient = useQueryClient();

	const importDoc = useMutation({
		mutationFn: importDocApi,
		onSuccess: () => {
			toast({ title: "OK", description: "Документ импортирован" });
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
		importDoc: importDoc.mutate,
		importDocAsync: importDoc.mutateAsync,
		isImporting: importDoc.isPending,
	};
};
