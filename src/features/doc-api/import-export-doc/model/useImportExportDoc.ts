import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { catalogKeys } from "@/entities/catalog";
import { docKeys } from "@/entities/doc-api";
import {
	type ImportDocPayload,
	type ImportTarget,
	importDocApi,
} from "../api/importDocApi";

/** Импорт doc-api из файла в открытый каталог. */
export const useImportExportDoc = (target: ImportTarget) => {
	const queryClient = useQueryClient();

	const importDoc = useMutation({
		mutationFn: (payload: ImportDocPayload) => importDocApi(payload, target),
		onSuccess: () => {
			toast({ title: "OK", description: "Документ импортирован" });
			queryClient.invalidateQueries({ queryKey: docKeys.lists() });
			queryClient.invalidateQueries({ queryKey: catalogKeys.all });
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
