import type { NodeKind } from "../model/catalog-node.entity";

/** Названия видов узлов для меню и подписей. */
export const KIND_LABEL: Record<NodeKind, string> = {
	catalog: "Каталог",
	docApi: "API-документ",
	docWs: "WebSocket",
	docErd: "ERD-диаграмма",
	markdown: "Markdown",
	file: "Файл",
};

/** Заголовки групп одного вида — над списком однотипных узлов. */
export const KIND_GROUP_LABEL: Record<NodeKind, string> = {
	catalog: "Каталоги",
	docApi: "API-документы",
	docWs: "WebSocket",
	docErd: "ERD-диаграммы",
	markdown: "Markdown",
	file: "Файлы",
};

/** Порядок, в котором виды узлов идут в списке: сначала каталоги, дальше
 *  документы от самого крупного к самому мелкому. */
export const KIND_ORDER: NodeKind[] = [
	"catalog",
	"docApi",
	"docErd",
	"docWs",
	"markdown",
	"file",
];

/** «2026-08-27 09:14:00» из БД → «27.08.2026». Время хранится в UTC. */
export const formatNodeDate = (value: string): string => {
	const date = new Date(`${value.replace(" ", "T")}Z`);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString("ru-RU");
};
