# Frontend Architecture

Руководство по архитектуре React-приложения на основе **Feature-Sliced Design (FSD)**. Этот документ описывает структуру, соглашения и паттерны, используемые в проекте.

---

## Стек технологий

| Категория        | Технологии                                          |
| ------------------| -----------------------------------------------------|
| Фреймворк        | React 18.3, TypeScript 5.9                          |
| Сборка           | Vite (rolldown-vite)                                |
| Роутинг          | React Router v7                                     |
| Стили            | Tailwind CSS                                        |
| UI-примитивы     | Radix UI (полный набор компонентов)                 |
| Иконки           | lucide-react, @fortawesome                          |
| Состояние        | Zustand (клиентский), TanStack Query v5 (серверный) |
| Формы            | React Hook Form + Zod                               |
| HTTP             | Axios                                               |
| Drag & Drop      | dnd-kit                                             |
| Биржа            | @binance/connector-typescript                       |
| Графики          | TradingView Charting Library                        |
| Линтер/Форматтер | Biome                                               |

---

## Архитектура: Feature-Sliced Design

Проект строго следует **6-слойной FSD**. Слои расположены от самого зависимого к самому независимому:

```
src/
├── app/        # Инициализация приложения
├── pages/      # Страницы (маршруты)
├── widgets/    # Крупные составные блоки UI
├── features/   # Бизнес-фичи (действия пользователя)
├── entities/   # Доменные сущности (CRUD + типы)
├── shared/     # Переиспользуемый код без бизнес-логики
└── core/       # Низкоуровневые сервисы и API-хендлеры
```

### Правило импортов

Каждый слой может импортировать **только нижележащие** слои:

```
app → pages → widgets → features → entities → shared → core
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

| Сущность | Назначение |
|----------|-----------|
| `agents/` | Торговые агенты |
| `algo-order/` | Алго-ордера |
| `core/` | Ядро системы |
| `core-log/` | Логи ядра |
| `exchange/` | Биржи |
| `market-data/` | Рыночные данные (тикеры, котировки) |
| `preset/` | Пресеты конфигурации |
| `strategy/` | Торговые стратегии |
| `symbol/` | Торговые пары (symbols) |
| `trading-account/` | Торговые аккаунты |
| `vanila-trading/` | Ванильная торговля |

### `shared/` — Общий слой

Переиспользуемый код без бизнес-логики. Не знает ни о каких слоях выше.

```
src/shared/
├── ui/               # UI-kit
├── api/              # HTTP-клиент, QueryClient
├── service/          # Сервисы (toaster)
├── config/           # Конфиги окружения, константы
├── lib/              # Утилиты, хуки
└── model/            # Базовые типы
```

### `core/` — Слой ядра

Низкоуровневые сервисы: инициализация соединений с биржами, обработчики API, системные сервисы.

---

## UI-kit (`shared/ui`)

Компоненты сгруппированы по назначению:

```
src/shared/ui/
├── controls/         # Элементы управления
│   ├── button.tsx
│   ├── input.tsx, label.tsx
│   ├── checkbox.tsx, switch.tsx
│   ├── select.tsx, radio-group.tsx, slider.tsx
│   └── index.ts
├── data-display/     # Компоненты отображения данных
│   ├── table.tsx, card.tsx
│   ├── avatar.tsx, scroll-area.tsx
│   ├── collapsible.tsx, hover-card.tsx
│   └── index.ts
├── navigation/       # Навигационные элементы
│   ├── tabs.tsx, dropdown-menu.tsx
│   ├── navigation-menu.tsx, command.tsx
│   ├── menubar.tsx, toggle.tsx
│   └── index.ts
├── overlays/         # Всплывающие элементы
│   ├── dialog.tsx, alert-dialog.tsx
│   ├── popover.tsx, tooltip.tsx, toast.tsx
│   └── index.ts
└── modal/            # Модальные окна
    └── DeleteModal.tsx
```

---

## Управление состоянием

### Zustand — клиентский стейт

Используется для **глобального клиентского состояния** (сессия, UI-стейт, выбранные сущности).

```typescript
// Типичная структура стора
interface AuthStore {
  user: User | null;
  setUser: (user: User) => void;
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: "auth-storage" }
  )
);
```

### TanStack Query v5 — серверный стейт

Используется для **кеширования и синхронизации данных с сервером**.

```typescript
// Запрос данных
const { data: symbols } = useQuery({
  queryKey: ["symbols"],
  queryFn: getSymbolsApi,
});

// Мутация
const { mutate } = useMutation({
  mutationFn: createOrderApi,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
});
```

---

## HTTP-слой

Axios с базовым URL из переменных окружения. Dev-прокси в `vite.config.ts` направляет `/api` на бэкенд.

```typescript
// shared/api/http-client.ts
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
```

Типизация ответов через `HttpSuccessResponse<T>` / `HttpErrorResponse` из `shared/model`.

---

## Валидация форм

React Hook Form + Zod:

```typescript
const schema = z.object({
  symbol: z.string().min(1),
  quantity: z.number().positive(),
});

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
});
```

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

## Инструменты качества кода

- **Biome** — линтинг и форматирование (заменяет ESLint + Prettier)
- **TypeScript strict mode** — строгая типизация
- **Zod** — валидация на границах системы (формы, API-ответы)
