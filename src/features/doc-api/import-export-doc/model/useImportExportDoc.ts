import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { catalogKeys } from "@/entities/catalog";
import { docKeys } from "@/entities/doc-api";
import {
	type ImportDocPayload,
	type ImportDocReport,
	type ImportTarget,
	importDocApi,
} from "../api/importDocApi";

/** Отчёт словами. Документ выбирает файл, а не пользователь, поэтому в тосте
 *  он назван по имени: так сразу видно, если файл прилетел не туда. Цифры тоже
 *  важны — «обновлено» без них неотличимо от «ничего не нашлось». */
const describe = (report: ImportDocReport): string => {
	const changes = [
		report.endpointsAdded && `добавлено эндпоинтов: ${report.endpointsAdded}`,
		report.endpointsUpdated && `обновлено: ${report.endpointsUpdated}`,
		report.groupsAdded && `новых групп: ${report.groupsAdded}`,
	].filter(Boolean);

	const what =
		changes.length > 0 ? changes.join(", ") : "в файле нет ни одного эндпоинта";

	return `«${report.docName}» — ${what}`;
};

/** Импорт doc-api из файла в открытый каталог. */
export const useImportExportDoc = (target: ImportTarget) => {
	const queryClient = useQueryClient();

	const importDoc = useMutation({
		mutationFn: (payload: ImportDocPayload) => importDocApi(payload, target),
		onSuccess: (report) => {
			toast({
				title: report.created ? "Документ создан" : "Документ обновлён",
				description: describe(report),
			});
			queryClient.invalidateQueries({ queryKey: docKeys.all });
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
