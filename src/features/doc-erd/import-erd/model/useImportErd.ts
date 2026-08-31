import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/core/toast";
import { catalogKeys, createNodeApi } from "@/entities/catalog";
import {
	createErdEntityApi,
	createRelationApi,
	type EntityPosition,
	updateEntityPositionsApi,
} from "@/entities/doc-erd";
import type { ImportErdPayload } from "../lib/parseErdImport";

/** Куда положить импортируемую диаграмму. */
export interface ImportErdTarget {
	platformId: string;
	parentId: string | null;
}

/**
 * Импорт ERD в открытый каталог: заводит узел-диаграмму, создаёт её таблицы,
 * расставляет их и связывает.
 *
 * Отдельной команды импорта у бэкенда нет — диаграмма целиком описывается
 * сущностями и связями, а команды для них уже есть. Форму файла проверяет
 * `parseErdImport` до первой записи, поэтому здесь остаётся только порядок
 * вызовов.
 */
export const useImportErd = (target: ImportErdTarget) => {
	const queryClient = useQueryClient();

	const importErd = useMutation({
		mutationFn: async (payload: ImportErdPayload) => {
			const node = await createNodeApi({
				platformId: target.platformId,
				parentId: target.parentId,
				name: payload.erd.name,
				desc: payload.erd.desc,
				payload: { kind: "docErd" },
			});

			// Таблицы создаются по очереди, а не пачкой: порядок вставки задаёт
			// порядок автолейаута для тех таблиц, у которых в файле нет координат.
			const entityId = new Map<string, string>();
			for (const table of payload.tables) {
				const id = await createErdEntityApi(node.id, {
					name: table.name,
					desc: table.desc,
					fields: table.fields,
				});
				entityId.set(table.name, id);
			}

			const idOf = (table: string): string => {
				const id = entityId.get(table);
				// Парсер уже проверил, что каждый конец связи ссылается на
				// описанную таблицу, — сюда можно попасть только при рассинхроне.
				if (!id) throw new Error(`Импорт: неизвестная таблица «${table}»`);
				return id;
			};

			// Координаты есть не у всех таблиц: у остальных позиция остаётся
			// пустой, и холст разложит их автолейаутом при первом открытии.
			const positions = payload.tables.flatMap<EntityPosition>((table) =>
				table.position ? [{ id: idOf(table.name), ...table.position }] : [],
			);
			if (positions.length > 0) await updateEntityPositionsApi(positions);

			for (const relation of payload.relations) {
				await createRelationApi({
					fromEntity: idOf(relation.fromTable),
					fromField: relation.fromColumn,
					toEntity: idOf(relation.toTable),
					toField: relation.toColumn,
				});
			}

			return {
				erdId: node.id,
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
