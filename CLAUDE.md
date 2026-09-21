# CLAUDE.md

Docpoint — настольное приложение для документирования и отладки API. Работает
локально: данные лежат в SQLite и файлах рядом с ней, внешний сервер не нужен.

---

## 1. Стек технологий

| Слой | Технологии |
| --- | --- |
| Оболочка | Tauri 2, Rust |
| Хранилище | SQLite через `sqlx`, миграции в `src-tauri/migrations` |
| Интерфейс | React 19, TypeScript 5.8, Vite 7 |
| Роутинг | React Router 7 (`react-router`) |
| Состояние | Zustand 5 (клиентское), TanStack Query 5 (серверное) |
| Формы | React Hook Form |
| Таблицы | TanStack Table 8 |
| Редакторы и разметка | CodeMirror 6, react-markdown, remark-gfm, Shiki |
| Оверлеи | Radix UI (Toast) |
| Стили | CSS Modules + CSS-переменные |
| WebAssembly | Rust-крейт `wasm/crates/canvas`, сборка через `wasm-pack` |
| Линтер / форматтер | Biome 2 |
| Линтер архитектуры | Steiger + `@feature-sliced/steiger-plugin` |
| Пакетный менеджер | Bun (`bun.lock`) |

### Команды

| Команда | Что делает |
| --- | --- |
| `bun run dev` | Vite dev-сервер |
| `bun run build` | `tsc` + сборка Vite |
| `bun run tauri dev` | Приложение целиком (Rust + фронтенд) |
| `bun run wasm` | Сборка wasm-крейтов в `wasm/pkg` |
| `bun run lint` | Biome с автофиксом |
| `bun run lint:arch` | Проверка FSD через Steiger |

---

## 2. Структура репозитория

```
.
├── src/          # Фронтенд (React, FSD)
├── src-tauri/    # Бэкенд приложения (Rust, Tauri)
├── wasm/         # Rust-крейты, собираемые в WebAssembly
├── docs/         # Документация проекта
└── public/       # Статика
```

---

## 3. Архитектура фронтенда: Feature-Sliced Design

Проект строго следует **7-слойной FSD**. Слои расположены от самого зависимого к
самому независимому:

```
src/
├── app/        # Инициализация приложения, провайдеры, роутер
├── pages/      # Страницы (маршруты)
├── widgets/    # Крупные составные блоки UI
├── features/   # Бизнес-фичи (действия пользователя)
├── entities/   # Доменные сущности (API, типы, DTO, сторы)
├── core/       # Низкоуровневые сервисы приложения
└── shared/     # Переиспользуемый код без бизнес-логики
```

### 3.1. Правило импортов

Каждый слой может импортировать **только нижележащие** слои:

```
app → pages → widgets → features → entities → core → shared
```

Запрещены: импорты вверх (`entities → features`, `shared → core`) и импорты между
слайсами одного слоя (`feature/a → feature/b`).

Для слоя `entities` есть два осознанных исключения:

- `entities/shared/` — value objects, общие для нескольких сущностей
  (например `http-method`);
- сегмент `@x/` — явный cross-import между сущностями, когда доменные типы
  композируются структурно (`entities/doc-api/endpoint/@x/doc-api`).

### 3.2. Публичное API (barrel exports)

Каждый слайс **обязан** иметь `index.ts` с явным экспортом:

```typescript
// src/entities/platform/index.ts
export { getPlatformApi } from "./api";
export type { Platform, PlatformDTO } from "./model";
```

Снаружи слайса импортируют только через `index.ts`:

```typescript
// Правильно
import { type Platform, getPlatformApi } from "@/entities/platform";

// Неправильно — нарушение публичного API
import type { Platform } from "@/entities/platform/model/platform.type";
```

Алиас `@/*` указывает на `src/*`, алиас `canvas-wasm` — на собранный wasm-пакет.

### 3.3. Сегменты слайса

```
entities/platform/
├── api/        # Функции обращения к бэкенду
├── model/      # Типы и DTO
├── store/      # Zustand-стор сущности
├── lib/        # Чистые хелперы слайса
├── ui/         # Компоненты слайса
└── index.ts    # Публичное API
```

Крупные домены группируются: `entities/doc-api/{doc-api, endpoint, group,
endpoint-request}`, `features/doc-api/{edit-doc-api, delete-group, …}`. У группы
свой `index.ts`, который реэкспортирует вложенные слайсы.

---

## 4. Слои фронтенда

### `app/` — Слой приложения

Точка входа и глобальные провайдеры.

```
src/app/
├── main.tsx          # ReactDOM.createRoot, QueryClientProvider, RouterProvider, Toaster
├── vite-env.d.ts
└── route/
    ├── route.tsx     # Конфигурация React Router 7
    └── index.ts
```

### `pages/` — Слой страниц

Каждая страница — отдельная папка с публичным `index.ts`. Страница только
компонует виджеты и фичи, собственной бизнес-логики не содержит.

Страницы: `home`, `platform-show`, `doc-api-show`, `endpoint-show`,
`doc-erd-show`, `doc-ws-show`, `markdown-show`, `environment`, `http-client`,
`ws-client`, `json-viewer`, `unix-time`, `generator`.

### `widgets/` — Слой виджетов

Крупные самодостаточные UI-блоки, объединяющие фичи и сущности:
`layout`, `sidebar`, `catalog-explorer`, `try-it`, `ws-console`.

### `features/` — Слой фич

Конкретные действия пользователя: UI + логика одной операции.

| Фича | Назначение |
| --- | --- |
| `catalog/` | Дерево каталогов: создание, переименование, перемещение узлов |
| `doc-api/` | Редактирование doc-api, групп, импорт/экспорт документа |
| `doc-erd/` | Работа со схемами, связями и областями ERD |
| `environment/` | Окружения платформы: переменные, авторизация, прокси |
| `markdown/` | Редактирование и экспорт markdown-документов |
| `platform/` | Создание и настройка платформ, импорт/экспорт |
| `request/` | Отправка HTTP-запросов и история |
| `websocket/` | Подключение и обмен сообщениями по WebSocket |

### `entities/` — Слой сущностей

Доменные объекты: типы, DTO, функции API, мапперы, сторы:
`platform`, `catalog`, `doc-api`, `doc-erd`, `websocket`, `markdown`, `file`,
`environment`, `request`, `db-source`, `shared`.

**Не содержит** UI, зависящего от бизнес-логики вышестоящих слоёв.

### `core/` — Слой ядра

Низкоуровневые сервисы приложения: `log` (глобальные перехватчики ошибок,
логирование в Tauri), `toast` (стор уведомлений и `Toaster`).

### `shared/` — Общий слой

Переиспользуемый код без бизнес-логики. Не знает ни о каких слоях выше.

```
src/shared/
├── ui-kit/    # UI-компоненты
├── svg/       # Иконки
├── lib/       # Чистые утилиты (cx, url, unix-time, *-color, markdown, random)
└── styles/    # Глобальные стили и токены
```

---

## 5. UI

### 5.1. Структура компонента

Один компонент — одна папка:

```
Button
├─ Button.module.css
├─ Button.tsx
└─ index.ts
```

### 5.2. Стили

Только **CSS Modules** рядом с компонентом. Глобальное — в `shared/styles`:

```
src/shared/styles/
├── index.css       # Точка входа
├── base.css        # Сброс и базовые стили
├── tokens.css      # CSS-переменные: цвета, отступы, типографика
└── apiDocs.module.css
```

Цвета и размеры берутся из токенов, а не задаются литералами в модуле компонента.

### 5.3. UI-kit (`shared/ui-kit`)

Компоненты сгруппированы по назначению, у каждой группы свой `index.ts`:

```
src/shared/ui-kit/
├── controls/       # Button, Checkbox, DropMenu, Field, HeadersEditor,
│                   # Input, RadioGroup, Select, Textarea, Toggle
├── data-display/   # Card, DataTable, JsonCode, JsonTree, Table
├── layout/         # DockLayout, ResizablePanelsLayout
├── modal/          # Dialog, ContextMenu
├── MarkdownEditor/
├── MarkdownView/
└── index.ts
```

Вложенная barrel-структура здесь осознанна: группа и есть точка входа, поэтому
для `shared/ui-kit/**` правило Steiger `no-public-api-sidestep` выключено.

### 5.4. Иконки (`shared/svg`)

**Все SVG-иконки живут только здесь.** Объявлять `<svg>` внутри страницы, виджета
или ui-kit-компонента нельзя — иконка добавляется в набор и импортируется из
`@/shared/svg`.

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

#### Как добавить новую иконку

1. Создать `src/shared/svg/ui/<ИмяIcon>.tsx` — имя файла совпадает с именем
   компонента и всегда заканчивается на `Icon`.
2. Добавить строку в `src/shared/svg/index.ts`:
   `export { <ИмяIcon> } from "./ui/<ИмяIcon>";`.

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
| --- | --- |
| `size` со значением по умолчанию | Размер, с которым иконка стоит чаще всего; на местах вызова переопределяется пропом `size={13}` |
| `stroke="currentColor"` | Цвет наследуется от текста — иконка не знает про тему |
| `aria-hidden="true"` статикой | Иконка декоративна; имя контролу даёт его собственный `aria-label`. Динамическое значение здесь ломает правило biome `noSvgWithoutTitle` |
| `{title ? <title>…</title> : null}` | Нативный тултип по требованию места вызова |
| `{...rest}` **последним** | Позволяет переопределить `className`, `style`, `strokeWidth` снаружи |

#### Правила набора

- **Одна иконка на понятие.** Прежде чем добавлять, поискать в `index.ts`
  существующую: разные размеры и толщины — это пропсы, а не новые компоненты.
  Не плодить `TrashSmallIcon` рядом с `TrashIcon`.
- **Никакой логики выбора.** Набор отдаёт только глифы; сопоставление вроде
  «тип узла → иконка» живёт в компоненте, который его использует (пример —
  `GLYPH_BY_KIND` в `widgets/catalog-explorer/ui/NodeIcon`).
- **Никаких фабрик и обёрток.** Каждая иконка — обычный компонент с явной
  разметкой, чтобы глиф был виден и находился поиском.
- **Состояние остаётся на месте вызова.** Поворот, подсветка, анимация делаются
  пропсами `style`/`className` или локальной обёрткой рядом с компонентом, а не
  вариантом иконки в наборе.

---

## 6. Состояние и данные

### 6.1. Zustand — клиентский стейт

Глобальное клиентское состояние: UI-стейт, выбранные сущности, сессия окружения.
Сложные сторы раскладываются на файлы:
`useDocApiStore.ts`, `docApiStore.actions.ts`, `docApiStore.selectors.ts`.

### 6.2. TanStack Query v5 — серверный стейт

Кеширование и синхронизация данных, полученных от бэкенда. `QueryClientProvider`
поднимается в `app/main.tsx`.

### 6.3. Обращение к бэкенду

HTTP-клиента на фронтенде нет: фронтенд общается с Rust через Tauri-команды.
Вызовы `invoke` инкапсулированы в сегменте `api/` сущности — выше по слоям
`invoke` не используется.

```typescript
// src/entities/doc-api/doc-api/api/get-doc-api.ts
import { invoke } from "@tauri-apps/api/core";
import type { Doc } from "../model/doc-api.type";

export function getDocApi({ id }: { id: string }): Promise<Doc | null> {
	return invoke("read_doc", { id });
}
```

Сетевые запросы пользователя (Try it, HTTP-клиент, WebSocket) выполняет Rust —
`infrastructure/http_client.rs` и `infrastructure/ws_client.rs`.

---

## 7. Архитектура бэкенда (`src-tauri`)

```
src-tauri/src/
├── main.rs, lib.rs     # Точка входа, регистрация команд Tauri
├── state.rs            # AppState (пул SQLite и общие ресурсы)
├── logging.rs
├── commands/           # Команды Tauri — тонкий слой, вызывает service
├── service/            # Use-cases: один файл на операцию
├── domain/             # Сущности, DTO, трейты репозиториев
├── repository/         # Реализации: sqlite/, filesystem/
└── infrastructure/     # http_client, ws_client, db_import (postgres, mysql, sqlite)
```

Поток вызова: `commands → service → domain (трейты) → repository / infrastructure`.
Домены повторяют фронтенд: `catalog`, `platform`, `doc_api`, `doc_erd`,
`websocket`, `environment`, `file`, `content`, `db_import`.

Имена файлов в `commands/` и `service/` совпадают с именем операции
(`create_platform.rs`, `read_platforms.rs`), имя команды Tauri — snake_case
(`read_doc`, `send_request`, `ws_connect`).

---

## 8. WebAssembly (`wasm`)

Часть вычислений canvas вынесена в Rust-крейт:

```
wasm/crates/canvas/
├── Cargo.toml
└── src/
    ├── lib.rs
    └── domain/{table, relation}/
```

Сборка — `bun run wasm` (результат в `wasm/pkg/canvas`), импорт из фронтенда —
по алиасу `canvas-wasm`.

---

## 9. Соглашения об именовании

| Элемент | Стиль | Пример |
| --- | --- | --- |
| Папки | kebab-case | `doc-api/`, `catalog-explorer/` |
| Файлы компонентов | PascalCase | `EditDocApiModal.tsx` |
| Файлы API-слайса | kebab-case | `create-platform-api.ts` |
| API-функции | camelCase с суффиксом `Api` | `getPlatformApi`, `createEndpointApi` |
| Файлы типов и DTO | kebab-case с суффиксом | `platform.type.ts`, `platform.dto.ts` |
| Типы / интерфейсы | PascalCase | `Platform`, `NodeKind` |
| Zustand-сторы | camelCase, файл `use*Store.ts` | `usePlatformsStore.ts` |
| Хуки, утилиты | camelCase | `useDocApiStore.ts`, `methodColor.ts` |
| Иконки | PascalCase с суффиксом `Icon` | `PlusIcon.tsx`, `ChevronRightIcon.tsx` |
| Модули Rust | snake_case | `import_platform.rs` |

---

## 10. Форматирование и проверки

- Biome: отступ — таб, двойные кавычки, автосортировка импортов
  (`bun run lint`). Из проверки исключены `dist`, `docs`, `public`.
- TypeScript: `strict`, `noUnusedLocals`, `noUnusedParameters`.
- Steiger проверяет соблюдение FSD (`bun run lint:arch`); отключённые правила и
  причины перечислены в `steiger.config.js`.
