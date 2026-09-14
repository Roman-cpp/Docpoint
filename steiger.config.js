import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

// Берём весь recommended (в т.ч. forbidden-imports — ловит кросс-импорты между
// entities и знает про исключение через `@x`, см. CLAUDE.md, раздел 3.1) и
// точечно выключаем 5 правил, которые конфликтуют с осознанными
// отступлениями проекта от стандартной FSD
// (свой слой `core`, `entities/shared`, группы сущностей, сегмент `store`)
// или не умеют смотреть сквозь вложенные barrel-группы. Разбор каждого —
// в истории обсуждения архитектуры, при необходимости пересмотреть.
export default defineConfig([
	...fsd.configs.recommended,
	{
		rules: {
			"fsd/insignificant-slice": "off",
			"fsd/no-reserved-folder-names": "off",
			"fsd/no-segmentless-slices": "off",
			"fsd/repetitive-naming": "off",
			"fsd/segments-by-purpose": "off",
		},
	},
	// shared/ui-kit группирует компоненты по назначению (controls, modal,
	// data-display, ...), у каждой группы свой index.ts — это осознанная
	// вложенная barrel-структура (см. CLAUDE.md, «UI-kit»). no-public-api-sidestep
	// не умеет смотреть сквозь неё и считает импорт из группы обходом public API
	// самого ui-kit, хотя группа — это и есть точка входа.
	{
		files: ["src/shared/ui-kit/**"],
		rules: {
			"fsd/no-public-api-sidestep": "off",
		},
	},
]);
