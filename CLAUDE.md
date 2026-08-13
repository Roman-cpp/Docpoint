# CLAUDE.md


### React

## Стек технологий

| Категория        | Технологии                                          |
| ------------------| -----------------------------------------------------|
| Фреймворк        | React, TypeScript                                   |
| Сборка           | Vite                                                |
| Роутинг          | React Router v7                                     |
| Состояние        | Zustand (клиентский), TanStack Query v5 (серверный) |
| Формы            | React Hook Form + Zod                               |
| HTTP             | Axios                                               |
| Линтер/Форматтер | Biome                                               |

---

В проекте используется scc modules.

#### Структура компонентов
Компоненты имею стлудеюшую структуру
```
Button
  ├─ Button.module.css
  ├─ Button.stories.tsx
  ├─ Button.tsx
  └─ index.ts
```

#### Файловая структура



### Архитектура: Feature-Sliced Design

Проект строго следует **6-слойной FSD**. Слои расположены от самого зависимого к самому независимому:

```
src/
├── app/        # Инициализация приложения
├── pages/      # Страницы (маршруты)
├── widgets/    # Крупные составные блоки UI
├── features/   # Бизнес-фичи (действия пользователя)
├── entities/   # Доменные сущности (CRUD + типы)
├── core/       # Низкоуровневые сервисы и API-хендлеры
└── shared/     # Переиспользуемый код без бизнес-логики
```

### Правило импортов

Каждый слой может импортировать **только нижележащие** слои:

```
app → pages → widgets → features → entities → core → shared 
```

Запрещены: импорты вверх (entities → features) и импорты между слайсами одного слоя (feature/a → feature/b).

### Публичное API (barrel exports)

Каждый слайс **обязан** иметь `index.ts` с явным экспортом:

```typescript
// src/entities/symbol/index.ts
export { getSymbolsApi } from "./api";
export type { Symbol, SymbolPreview } from "./model";
```

Снаружи слайса импортируют только через `index.ts`:
```typescript
// Правильно
import { Symbol, getSymbolsApi } from "@/entities/symbol";

// Неправильно — нарушение публичного API
import { Symbol } from "@/entities/symbol/model/symbol.type";
```

---

## Структура слоёв

### `app/` — Слой приложения

Точка входа, глобальные провайдеры, роутинг.

```
src/app/
├── App.tsx           # QueryClientProvider + RouterProvider
├── main.tsx          # ReactDOM.createRoot
├── index.css         # Глобальные стили
└── route/
    ├── route.tsx     # Конфигурация React Router v7
    └── index.ts
```

### `pages/` — Слой страниц

Каждая страница — отдельная папка с публичным `index.ts`. Страница только компонует виджеты и фичи, не содержит собственной логики.

### `widgets/` — Слой виджетов

Крупные, самодостаточные UI-блоки, которые объединяют фичи и сущности.

### `features/` — Слой фич

Реализует конкретные действия пользователя. Содержит UI + логику для одной операции.

| Фича | Назначение |
|------|-----------|
| `algo-order/` | Создание и управление алго-ордерами |
| `auth/` | Аутентификация и сессия |
| `core/` | Общие фичи ядра |
| `preset/` | Управление пресетами |
| `realtime/` | Realtime-обновления (WebSocket) |
| `trading-account/` | Управление торговыми аккаунтами |

### `entities/` — Слой сущностей

Доменные объекты: типы, API-функции, Zod-схемы, маперы, хранилище.
**Не должен содержать UI**, зависящий от бизнес-логики вышестоящих слоёв.

### `core/` — Слой ядра

Низкоуровневые сервисы: инициализация соединений с биржами, обработчики API, системные сервисы.

### `shared/` — Общий слой

Переиспользуемый код без бизнес-логики. Не знает ни о каких слоях выше.

## UI-kit (`shared/ui`)

Компоненты сгруппированы по назначению:

```
src/shared/ui-kit/
├── controls/         # Элементы управления
│   ├── Button
│   ├── Checkbox
│   ├── Select
│   └── index.ts
├── data-display/     # Компоненты отображения данных
│   ├── Card
│   └── index.ts
├── navigation/       # Навигационные элементы
│   ├── Tabs
│   └── index.ts
├── overlays/         # Всплывающие элементы
│   ├── Dialog
│   ├── DropdownMenu
│   └── index.ts
├── layout/            # Шаблоны
```

---

## Иконки (`shared/svg`)

**Все SVG-иконки живут только здесь.** Объявлять `<svg>` внутри страницы, виджета или ui-kit-компонента нельзя — вместо этого добавляется иконка в набор и импортируется из `@/shared/svg`.

```
src/shared/svg/
├── index.ts              # баррель: по строке реэкспорта на иконку
├── model/
│   └── icon.type.ts      # IconProps — внутренний тип набора
└── ui/
    ├── PlusIcon.tsx      # один файл на одну иконку
    ├── TrashIcon.tsx
    └── …
```

### Как добавить новую иконку

1. Создать `src/shared/svg/ui/<ИмяIcon>.tsx` — имя файла совпадает с именем компонента и всегда заканчивается на `Icon`.
2. Добавить строку в `src/shared/svg/index.ts`: `export { <ИмяIcon> } from "./ui/<ИмяIcon>";`.

```tsx
import type { FC } from "react";
import type { IconProps } from "../model/icon.type";

export const PlusIcon: FC<IconProps> = ({ size = 14, title, ...rest }) => (
	<svg
		viewBox="0 0 16 16"
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		strokeWidth={1.4}
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...rest}
	>
		{title ? <title>{title}</title> : null}
		<path d="M8 3v10M3 8h10" />
	</svg>
);
```

Обязательные свойства шаблона:

| Что | Зачем |
| ----| ------|
| `size` с значением по умолчанию | Размер, с которым иконка стоит чаще всего; на местах вызова переопределяется пропом `size={13}` |
| `stroke="currentColor"` | Цвет наследуется от текста — иконка не знает про тему |
| `aria-hidden="true"` статикой | Иконка декоративна; имя контролу даёт его собственный `aria-label`. Динамическое значение здесь ломает правило biome `noSvgWithoutTitle` |
| `{title ? <title>…</title> : null}` | Нативный тултип по требованию места вызова |
| `{...rest}` **последним** | Позволяет переопределить `className`, `style`, `strokeWidth` снаружи |

### Правила набора

- **Одна иконка на понятие.** Прежде чем добавлять, поискать в `index.ts` существующую: разные размеры и толщины — это пропсы, а не новые компоненты. Не плодить `TrashSmallIcon` рядом с `TrashIcon`.
- **Никакой логики выбора.** Набор отдаёт только глифы; сопоставление вроде «тип файла → иконка» живёт в компоненте, который его использует (пример — `GLYPH_BY_KIND` в `widgets/vault-browser/ui/FileGrid`).
- **Никаких фабрик и обёрток.** Каждая иконка — обычный компонент с явной разметкой, чтобы глиф был виден и находился поиском.
- **Состояние остаётся на месте вызова.** Поворот, подсветка, анимация делаются пропсами `style`/`className` или локальной обёрткой рядом с компонентом (например `Caret` в `HcDrawer`), а не вариантом иконки в наборе.

---

## Управление состоянием

### Zustand — клиентский стейт

Используется для **глобального клиентского состояния** (сессия, UI-стейт, выбранные сущности).

### TanStack Query v5 — серверный стейт

Используется для **кеширования и синхронизации данных с сервером**.

---

## Соглашения об именовании

| Элемент           | Стиль      | Пример                                   |
| -------------------| ------------| ------------------------------------------|
| Файлы компонентов | PascalCase | `LoginForm.tsx`                          |
| Хуки, утилиты     | camelCase  | `useLogin.ts`, `extractErrorMessage.ts`  |
| Папки             | kebab-case | `algo-order/`, `console-panel/`          |
| Типы / интерфейсы | PascalCase | `StrategyPreview`, `HttpSuccessResponse` |
| Zustand-сторы     | camelCase  | `useAuthStore.ts`                        |
| API-функции       | camelCase  | `getSymbolsApi`, `createOrderApi`        |
| Иконки            | PascalCase | `PlusIcon.tsx`, `ChevronRightIcon.tsx`   |



#### architecture

Релизация некоторых архатектурный решний находиться в папке docs/architecture
