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

| Виджет | Назначение |
|--------|-----------|
| `header/` | Шапка приложения |
| `panels/` | Торговые панели (vanilla-trading и др.) |

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



#### architecture

Релизация некоторых архатектурный решний находиться в папке docs/architecture
