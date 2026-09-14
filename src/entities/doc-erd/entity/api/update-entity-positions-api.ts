import { invoke } from "@tauri-apps/api/core";
import type { EntityPosition } from "../model/entity.type";

/**
 * Сохраняет положение таблиц на ERD-холсте. Принимает пачку: холст копит
 * перемещения и сбрасывает их одним вызовом, который на бэкенде выполняется
 * одной транзакцией.
 */
export function updateEntityPositionsApi(
	positions: EntityPosition[],
): Promise<void> {
	return invoke("update_schema_positions", { positions });
}
