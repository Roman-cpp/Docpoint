# Frontend Architecture

Обзорный документ и оглавление по архитектуре React-приложения на основе
**Feature-Sliced Design (FSD)**. Здесь — только слои, правило импортов и ссылки на
профильные стандарты. Подробности — по ссылкам в каждом разделе.

Стек технологий с версиями — в [CLAUDE.md](../../CLAUDE.md).

---

## 1. Слои

Проект строго следует **7-слойной FSD**. Слои расположены от самого зависимого к
самому независимому:

```text
src/
├── app/        # Инициализация приложения, провайдеры, роутер
├── pages/      # Страницы (маршруты)
├── widgets/    # Крупные составные блоки UI (панели, layout, header)
├── features/   # Бизнес-фичи (действия пользователя)
├── entities/   # Доменные сущности (API, типы, мапперы, сторы)
├── core/       # Низкоуровневые сервисы: HTTP/WS-клиенты, auth, hotkeys, toaster
└── shared/     # Переиспользуемый код без бизнес-логики
```

### 1.1. Правило импортов

Каждый слой может импортировать **только нижележащие** слои:

```text
app → pages → widgets → features → entities → core → shared
```

Запрещены: импорты вверх (`entities → features`, `shared → core`) и импорты между
слайсами одного слоя (`feature/a → feature/b`). Для слоя `entities` есть два явных
исключения — `entities/shared` для value objects и cross-import через `@x` для
структурной композиции доменных типов, см. [layers/entities-layer.md](./layers/entities-layer.md).

### 1.2. Публичное API (barrel exports)

Каждый слайс **обязан** иметь `index.ts` с явным экспортом. Снаружи слайса импортируют
только через него:

```typescript
// Правильно
import { Symbol, getSymbolsApi } from "@/entities/symbol";

// Неправильно — нарушение публичного API
import { Symbol } from "@/entities/symbol/model/symbol.type";
```

---

## 2. Стандарты по слоям

| Слой       | Документ                                                     | Что внутри                                                        |
| ---------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| `app`      | [layers/app-layer.md](./layers/app-layer.md)                 | `main.tsx`, `App.tsx`, дерево провайдеров, сегмент `route`        |
| `pages`    | [layers/pages-layer.md](./layers/pages-layer.md)             | Структура страницы, `{Page}Page.tsx`, правила импорта             |
| `widgets`  | [panel/panel-architecture-template.md](./panel/panel-architecture-template.md) | Панели терминала в `widgets/panels`; список — [panel/panels.md](./panel/panels.md) |
| `features` | —                                                            | См. 2.1                                                           |
| `entities` | [layers/entities-layer.md](./layers/entities-layer.md)       | Сегменты `api` / `model` / `store` / `ui`, группы, `entities/shared` |
| `core`     | —                                                            | См. 2.2                                                           |
| `shared`   | —                                                            | См. 2.3                                                           |

### 2.1. `features/` — слой фич

Отдельного стандарта пока нет. Принятая структура: слайс на домен
(`auth/`, `core/`, `trading-account/` …), внутри — папка на каждое действие пользователя
(`create-trading-account/`, `login/`, `switch-symbol/`) с сегментами `ui`, `model`, `lib`
и общим `index.ts` слайса. Фича не импортирует другие фичи.

### 2.2. `core/` — слой ядра

Низкоуровневые сервисы без доменного смысла. Импортирует только `shared`.

```text
src/core/
├── http-client/      # Axios-клиенты, интерцепторы     → api/api.md, api/response-format.md
├── ws-client/        # Мультиплексор /ws, useStreams   → ws/websocket.md
├── auth/             # useSessionStore, login / refresh / me
├── hotkeys/          # HotkeyProvider, useHotkeyStore
└── toaster/          # Toast-сервис
```

### 2.3. `shared/` — общий слой

Самый нижний слой: переиспользуемый код без бизнес-логики. Не знает ни о каких слоях
выше, включая `core`.

```text
src/shared/
├── ui/               # UI-kit                          → раздел 4
├── api/              # QueryClient, утилиты HTTP-ответов
├── config/           # envConfig, константы            → config/env.md
├── lib/              # Утилиты, хуки
└── model/            # Базовые типы (HttpSuccessResponse, EnvConfig)
```

---

## 3. Данные и состояние

| Тема                                   | Документ                                                     |
| -------------------------------------- | ------------------------------------------------------------ |
| API-функции, типы ответа, мапперы, DTO | [api/api.md](./api/api.md)                                   |
| Конверт ответа бэкенда, ошибки, `violations` | [api/response-format.md](./api/response-format.md)     |
| Серверный стейт: React Query, `use{Entities}Store`, query keys | [store/store.md](./store/store.md)  |
| Клиентский стейт панели: Zustand-стор  | [panel/panel-store-architecture.md](./panel/panel-store-architecture.md) |
| WebSocket: мультиплексор `/ws`, `useStreams`, выделенные сокеты | [ws/websocket.md](./ws/websocket.md) |
| Переменные окружения, `envConfig`      | [config/env.md](./config/env.md)                             |
| Маршрутизация, лоадеры, lazy-страницы  | [routing/routing.md](./routing/routing.md)                   |

Разделение ответственности:

- **TanStack Query** — всё, что приходит с сервера по HTTP. Хуки `use{Entities}Store`
  в `entities/*/store` — это обёртки над `useQuery` / `useMutation`, не Zustand.
- **Zustand** — клиентское состояние: сессия (`core/auth/useSessionStore`), хоткеи,
  UI-стейт панелей.
- **Формы** — React Hook Form + Zod, схемы валидации живут в сегменте `model`
  соответствующей сущности или фичи. Отдельного стандарта нет.

---

## 4. UI

UI-kit лежит в `src/shared/ui/`, компоненты сгруппированы по назначению, у каждой
группы свой `index.ts`:

```text
src/shared/ui/
├── controls/         # button, input, select, slider, switch …
├── data-display/     # table, card, badge, avatar, scroll-area
├── navigation/       # tabs, dropdown-menu, menubar, command
├── overlays/         # popover, tooltip, hover-card
├── modal/            # dialog, alert-dialog, ConfirmModal, DeleteModal, JsonModal
└── feedback/         # PanelWarning
```

Стили — Tailwind CSS поверх Radix-примитивов. Отдельного стандарта UI-kit нет.

---

## 5. Соглашения об именовании

Общие правила проекта. Уточнения по слоям — в сводках соответствующих стандартов
([entities](./layers/entities-layer.md#8-нейминг--сводка),
[pages](./layers/pages-layer.md#4-нейминг--сводка),
[app](./layers/app-layer.md#5-нейминг--сводка)).

| Элемент           | Стиль      | Пример                                   |
| ----------------- | ---------- | ---------------------------------------- |
| Файлы компонентов | PascalCase | `LoginForm.tsx`                          |
| Хуки, утилиты     | camelCase  | `useLogin.ts`, `extractErrorMessage.ts`  |
| Папки             | kebab-case | `algo-order/`, `console-panel/`          |
| Типы / интерфейсы | PascalCase | `StrategyPreview`, `HttpSuccessResponse` |
| Сторы             | camelCase  | `useSessionStore.ts`, `useOrdersStore.ts` |
| API-функции       | camelCase  | `getSymbolsApi`, `createOrderApi`        |
| Файлы сегмента `api` | kebab-case | `get-symbols-api.ts`                  |

---

## 6. Инструменты качества кода

- **Biome** — линтинг и форматирование (`bun run lint`, `bun run format`).
- **TypeScript strict mode** — строгая типизация, `any` не используется.
- **Zod** — валидация на границах системы (формы, API-ответы).
