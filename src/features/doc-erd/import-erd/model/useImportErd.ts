import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { type CreateNodeDTO, catalogKeys } from "@/entities/catalog";
import { importErdApi } from "../api/importErdApi";
import { layoutErdTables } from "../lib/layoutErdTables";
import type { ImportErdPayload } from "../lib/parseErdImport";

/** Куда положить импортируемую диаграмму. */
export interface ImportErdTarget {
	platformId: string;
	parentId: string | null;
}

/**
 * Импорт ERD в открытый каталог: одна команда заводит узел-диаграмму, её
 * таблицы и связи между ними.
 *
 * Всё делается на бэкенде, потому что id таблиц выдаёт база, а связи в файле
 * адресуют таблицы именами: сопоставление «имя → id» должна вести та же
 * сторона, что раздаёт id. Форму файла проверяет `parseErdImport` до вызова,
 * здесь остаётся раскладка — координат в файле нет, их считает
 * `layoutErdTables`.
 */
export const useImportErd = (target: ImportErdTarget) => {
	const queryClient = useQueryClient();

	const importErd = useMutation({
		mutationFn: async (payload: ImportErdPayload) => {
			const node: CreateNodeDTO = {
				platformId: target.platformId,
				parentId: target.parentId,
				name: payload.erd.name,
				payload: { kind: "docErd" },
			};

			const layout = layoutErdTables(payload.tables);
			const tables = payload.tables.map((table, index) => ({
				...table,
				...layout[index],
			}));

			const erdId = await importErdApi(node, tables, payload.relations);

			return {
				erdId,
				tables: payload.tables.length,
				relations: payload.relations.length,
			};
		},
		onSuccess: ({ tables, relations }) => {
			toast({
				title: "OK",
				description: `ERD импортирован: таблиц ${tables}, связей ${relations}`,
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
