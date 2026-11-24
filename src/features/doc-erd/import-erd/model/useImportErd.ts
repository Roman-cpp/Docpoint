import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { type CreateNodeDTO, catalogKeys } from "@/entities/catalog";
import type { ImportErdPayload } from "@/entities/doc-erd";
import { type ImportErdReport, importErdApi } from "../api/importErdApi";

/** Куда положить импортируемую диаграмму. */
export interface ImportErdTarget {
	platformId: string;
	parentId: string | null;
}

/** Отчёт словами: диаграмму выбирает файл, а не пользователь, поэтому в тосте
 *  она названа по имени — так сразу видно, если файл прилетел не туда. */
const describe = (report: ImportErdReport): string => {
	const changes = [
		report.tablesAdded && `добавлено таблиц: ${report.tablesAdded}`,
		report.tablesUpdated && `обновлено: ${report.tablesUpdated}`,
		report.relationsAdded && `новых связей: ${report.relationsAdded}`,
	].filter(Boolean);

	const what = changes.length > 0 ? changes.join(", ") : "в файле нет таблиц";

	return `«${report.docName}» — ${what}`;
};

/**
 * Импорт ERD в открытый каталог: одна команда заводит узел-диаграмму, её
 * таблицы и связи между ними — или дописывает ту, что файл называет своим
 * `id`.
 *
 * Всё делается на бэкенде, потому что id таблиц выдаёт база, а связи в файле
 * адресуют таблицы именами: сопоставление «имя → id» должна вести та же
 * сторона, что раздаёт id. Там же считается и раскладка — она зависит от того,
 * что уже лежит на диаграмме. Форму файла проверяет `parseErdImport` до вызова.
 */
export const useImportErd = (target: ImportErdTarget) => {
	const queryClient = useQueryClient();

	const importErd = useMutation({
		mutationFn: async (payload: ImportErdPayload) => {
			const node: CreateNodeDTO = {
				id: payload.erd.id ?? null,
				platformId: target.platformId,
				parentId: target.parentId,
				name: payload.erd.name,
				payload: { kind: "docErd" },
			};

			return importErdApi(node, payload.tables, payload.relations);
		},
		onSuccess: (report) => {
			toast({
				title: report.created ? "Диаграмма создана" : "Диаграмма обновлена",
				description: describe(report),
			});
			queryClient.invalidateQueries({ queryKey: catalogKeys.all });
		},
		onError: (error: Error) => {
			toast({ title: "Ошибка", description: error.message, variant: "error" });
		},
	});

	return {
		importErd: importErd.mutate,
		importErdAsync: importErd.mutateAsync,
		isImportingErd: importErd.isPending,
	};
};
