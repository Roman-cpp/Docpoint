# Руководство по созданию Store
### React Query + TypeScript — разбор паттерна `useTradingAccountsStore`

---

## 1. Структура Store

Store — это кастомный хук, который инкапсулирует всю работу с данными одной сущности: запросы, мутации, статусы загрузки и ошибки. Компоненты используют только возвращаемый интерфейс и ничего не знают о деталях реализации.

Каждый store состоит из трёх частей:
1. **Query Keys** — объект с фабриками ключей для кеша
2. **Параметры хука** — `id` и `filters` для управления запросами
3. **Возвращаемый интерфейс** — данные, статусы, методы

| Технология | Назначение |
|---|---|
| `@tanstack/react-query` | Кеш, загрузка, инвалидация данных |
| `useQuery` | Получение данных (GET) |
| `useMutation` | Изменение данных (POST / PATCH / DELETE) |
| `queryClient` | Управление кешем глобально |
| Query Keys | Идентификаторы для кеша и инвалидации |

---

### 1.1 Query Keys

Query Key — уникальный идентификатор запроса в кеше. React Query использует его для хранения, поиска и инвалидации данных. Ключ должен отражать иерархию: **сущность → тип → параметры**.

```typescript
export const tradingAccountKeys = {
  // Корень — инвалидирует ВСЁ связанное с tradingAccounts
  all: ["tradingAccounts"] as const,

  // Все списки
  lists: () => [...tradingAccountKeys.all, "list"] as const,

  // Список с фильтрами
  list: (filters: TradingAccountFilters) =>
    [...tradingAccountKeys.lists(), filters] as const,

  // Все детальные записи
  details: () => [...tradingAccountKeys.all, "detail"] as const,

  // Конкретная запись по id
  detail: (id: string) => [...tradingAccountKeys.details(), id] as const,
};
```

> 💡 Используй иерархические ключи: `all → lists → list(filters)`. Тогда `invalidateQueries({ queryKey: lists() })` автоматически затронет все варианты с фильтрами.

| Метод | Ключ | Инвалидирует |
|---|---|---|
| `all` | `["tradingAccounts"]` | Всё |
| `lists()` | `["tradingAccounts", "list"]` | Все списки |
| `list(filters)` | `["tradingAccounts", "list", {...}]` | Конкретный список |
| `details()` | `["tradingAccounts", "detail"]` | Все записи |
| `detail(id)` | `["tradingAccounts", "detail", "123"]` | Конкретную запись |

---

### 1.2 Параметры хука

```typescript
export const useTradingAccountsStore = ({
  id,
  filters,
}: UseTradingAccountsStoreParams = {}) => {
  const queryClient = useQueryClient();
  // ... queries & mutations
};
```

- `id` — опциональный, нужен только когда загружаем одну запись
- `filters` — входят в `queryKey`, поэтому при изменении фильтра React Query автоматически делает новый запрос

---

## 2. Запросы — `useQuery`

`useQuery` отвечает за получение данных. Он автоматически кеширует результат, дедублирует параллельные запросы и перезапрашивает данные при изменении `queryKey`.

```typescript
const tradingAccounts = useQuery<TradingAccount[]>({
  // ✅ Фильтры ВХОДЯТ в ключ — при изменении filters
  //    React Query автоматически перезапросит данные
  queryKey: tradingAccountKeys.list(filters ?? {}),
  queryFn: () => getTradingAccountsApi(filters),
});
```

> ⚠️ Фильтры **обязательно** должны входить в `queryKey`. Если использовать `lists()` вместо `list(filters ?? {})`, React Query не заметит изменения фильтра и не сделает новый запрос.

---

### 2.1 Запрос одной записи

Запрос одной записи включается только при наличии `id` — через параметр `enabled`:

```typescript
const tradingAccount = useQuery<TradingAccount>({
  queryKey: tradingAccountKeys.detail(id ?? ""),
  queryFn:  () => getTradingAccountByIdApi(id!),
  enabled:  Boolean(id), // ← Запрос не выполняется без id
});
```

---

### 2.2 Что возвращает `useQuery`

| Поле | Тип | Описание |
|---|---|---|
| `data` | `T \| undefined` | Данные из кеша |
| `isLoading` | `boolean` | Первая загрузка (нет данных в кеше) |
| `isFetching` | `boolean` | Любая загрузка (в т.ч. фоновое обновление) |
| `isError` | `boolean` | Запрос завершился ошибкой |
| `error` | `Error \| null` | Объект ошибки |
| `isSuccess` | `boolean` | Данные успешно получены |

---

## 3. Мутации — `useMutation`

`useMutation` используется для операций, изменяющих данные на сервере: создание, обновление, удаление. После успешной мутации нужно инвалидировать связанные запросы.

```typescript
const createTradingAccount = useMutation({
  mutationFn: (dto: CreateTradingAccountDTO) => createTradingAccountApi(dto),
  onSuccess: () => {
    toast({ title: "OK", description: "Создан" });
    // Инвалидирует ВСЕ списки (частичное совпадение ключей)
    queryClient.invalidateQueries({
      queryKey: tradingAccountKeys.lists(),
    });
  },
  onError: (error) => {
    toast({ title: "Ошибка", description: error.message, variant: "destructive" });
  },
});
```

---

### 3.1 Колбэки мутации

| Колбэк | Когда вызывается |
|---|---|
| `onSuccess(data, vars)` | Запрос завершился успешно |
| `onError(error, vars)` | Запрос завершился ошибкой |
| `onSettled(data, err)` | После завершения (успех или ошибка) |
| `onMutate(vars)` | Перед отправкой запроса |

---

### 3.2 Инвалидация vs удаление из кеша

| Метод | Что делает | Когда использовать |
|---|---|---|
| `invalidateQueries` | Помечает stale, перезапрашивает | После create / update |
| `removeQueries` | Удаляет из кеша полностью | После delete |
| `setQueryData` | Обновляет кеш без запроса | Optimistic update |

В примере при удалении используются оба метода:

```typescript
// Удалить конкретную запись из кеша
queryClient.removeQueries({
  queryKey: tradingAccountKeys.detail(deletedId),
});

// Обновить все списки
queryClient.invalidateQueries({
  queryKey: tradingAccountKeys.lists(),
});
```

---

## 4. Возвращаемый интерфейс

Хук возвращает плоский объект — без вложенности. Компоненты деструктурируют только то, что им нужно. Данные всегда имеют безопасное значение по умолчанию (`[]` или `null`).

```typescript
return {
  // Данные
  tradingAccounts: tradingAccounts.data ?? [],
  tradingAccount:  tradingAccount.data  ?? null,

  // Статусы
  isTradingAccountsLoading: tradingAccounts.isLoading,
  isTradingAccountsError:   tradingAccounts.isError,

  // Методы
  createTradingAccount: createTradingAccount.mutate,
  updateTradingAccount: updateTradingAccount.mutate,
  deleteTradingAccount: deleteTradingAccount.mutate,

  // Статусы мутаций
  isCreating: createTradingAccount.isPending,
  isUpdating: updateTradingAccount.isPending,
  isDeleting: deleteTradingAccount.isPending,
};
```

---

### 4.1 Соглашение об именовании

| Паттерн | Пример |
|---|---|
| Данные списка | `tradingAccounts: []` |
| Данные записи | `tradingAccount: null` |
| Загрузка списка | `isTradingAccountsLoading` |
| Ошибка списка | `isTradingAccountsError` |
| Статус мутации | `isCreating / isUpdating / isDeleting` |
| Метод мутации | `createTradingAccount(dto)` |

---

## 5. Использование в компоненте

```typescript
// Список с фильтром по бирже
const { tradingAccounts, isCreating } = useTradingAccountsStore({
  filters: { exchange: "binance" },
});

// Один аккаунт по id
const { tradingAccount } = useTradingAccountsStore({ id: "abc-123" });

// Вызов мутации
createTradingAccount({ alias: "Main", apiKey: "xxx" });
```

> 💡 При изменении `exchangeId` — `queryKey` автоматически меняется, React Query запустит новый запрос и закеширует результат отдельно для каждого значения фильтра.

---

### 5.1 Пример компонента

```tsx
export function TradingAccountSelect({ exchangeId, onChange }) {
  const { tradingAccounts } = useTradingAccountsStore({
    filters: { exchange: exchangeId }, // ← queryKey меняется автоматически
  });

  return (
    <Select onValueChange={onChange}>
      {tradingAccounts.map(acc => (
        <SelectItem key={acc.id} value={acc.id}>{acc.alias}</SelectItem>
      ))}
    </Select>
  );
}
```

---

## 6. Создание нового Store

**Алгоритм:**

1. Определить тип сущности и DTO для создания/обновления
2. Создать объект `queryKeys` с иерархией: `all → lists → list → details → detail`
3. Создать хук `useXxxStore` с параметрами `id` и `filters`
4. Добавить `useQuery` для списка (с `filters` в ключе) и для одной записи (с `enabled`)
5. Добавить `useMutation` для каждой операции (create, update, delete)
6. В `onSuccess` каждой мутации вызвать `invalidateQueries`
7. Вернуть плоский объект с данными, статусами и методами

---

### 6.1 Шаблон нового Store

```typescript
// 1. Тип и DTO
interface Order { id: string; symbol: string; }
interface CreateOrderDTO { symbol: string; qty: number; }

// 2. Query keys
export const orderKeys = {
  all:     ["orders"] as const,
  lists:   () => [...orderKeys.all, "list"] as const,
  list:    (f: OrderFilters) => [...orderKeys.lists(), f] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail:  (id: string)     => [...orderKeys.details(), id] as const,
};

// 3. Хук
export const useOrdersStore = ({ id, filters } = {}) => {
  const queryClient = useQueryClient();

  const orders = useQuery<Order[]>({
    queryKey: orderKeys.list(filters ?? {}),
    queryFn:  () => getOrdersApi(filters),
  });

  const createOrder = useMutation({
    mutationFn: (dto: CreateOrderDTO) => createOrderApi(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });

  return {
    orders:      orders.data ?? [],
    isLoading:   orders.isLoading,
    createOrder: createOrder.mutate,
    isCreating:  createOrder.isPending,
  };
};
```

---
