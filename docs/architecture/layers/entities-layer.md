# Стандарт слоя `entities` (FSD)

Область действия: `src/entities/`. Стандарт основан на FSD 2.1 с осознанными отступлениями, помеченными как **[исключение из FSD]**.

---

## 1. Основные термины

**Value Object (VO)** — объект, который определяется своими атрибутами, а не идентичностью. У него нет ID; два VO с одинаковыми значениями полей считаются равными.

**Entity (сущность)** — объект, который определяется своей идентичностью, а не значениями атрибутов. У него есть ID, и он остаётся «тем же самым» объектом на протяжении всего жизненного цикла, даже если все его поля изменились.

**Entity Group (группа сущностей)** — тесно связанные сущности, структурно сгруппированные в одну папку. Группа обязана иметь собственный public API (раздел 6).

**Public API** — единственная официальная входная точка slice (сущности или группы): файл `index.ts` в корне, ре-экспортирующий только то, что сознательно открывается наружу. Импорт внутренних файлов в обход `index.ts` запрещён.

> Примечание: в этом проекте слайсы слоя `entities` моделируются в духе DDD-сущностей. Это наше соглашение поверх FSD — в самой спецификации FSD «entity» означает лишь «слайс про бизнес-домен».

---

## 2. Структура слоя

```
src/entities/
├── shared/                  # value objects (раздел 3)
│   └── {value-object}/
│       └── index.ts
├── {entity}/
│   └── index.ts
├── {entity}/
│   └── index.ts
└── {entity-group}/
    └── index.ts
```

Имя `shared` внутри `src/entities/` **зарезервировано** — бизнес-сущность так называть нельзя.

---

## 3. `entities/shared` — value objects

**[исключение из FSD]** Специальный слайс, хранящий value objects, общие для сущностей слоя.

1. Любая сущность в `src/entities/` может импортировать из `entities/shared` через её public API. Это **единственное** разрешённое исключение из запрета кросс-импортов.
2. `entities/shared` не импортирует ничего из других слайсов слоя `entities`.
3. В `entities/shared` живут только value objects — без ID, без сторов, без API-запросов.
4. Каждый value object лежит в своей папке с собственным `index.ts`.

---

## 4. Кросс-импорты между сущностями

По умолчанию **запрещены**. `entities/order` не может импортировать из `entities/user` ни напрямую, ни через public API. Композиция нескольких сущностей выполняется на вышестоящих слоях (`features`, `widgets`, `pages`). Для UI-композиции — render props / slots: компонент сущности принимает чужой контент как проп.

Из этого правила два явных исключения: `entities/shared` (раздел 3) и `@x` (раздел 4.1).

### 4.1. `@x` — cross-import для структурной композиции

**[исключение из FSD]** Иногда одна сущность по смыслу домена **состоит** из другой — например, `StrategyConfig.algoOrders: AlgoOrder[]`: стратегия структурно включает алго-ордера, а не просто использует независимый от неё тип. Такую связь нельзя поднять на `features`/`widgets`, потому что она нужна прямо на уровне entities — в доменном типе, DTO, мапперах и сторе того же слоя.

Правила:

1. Сущность-источник заводит в своём корне директорию `@x/` и внутри неё — **по одному файлу на каждую сущность-потребителя**, названному ровно как слайс потребителя (`@x/strategy.ts`, `@x/core.ts`, `@x/preset.ts` — не `@x/algo-order.ts`, не по названию концепции). Это требование самого FSD (`@feature-sliced/filesystem`, на нём построен и линтер Steiger, см. раздел 9): файл `@x/{consumer}.ts` — публичный API, выставленный именно для слайса `{consumer}`, и только для него.
2. В файле `@x/{consumer}.ts` перечисляется всё, что нужно именно этому потребителю — не общий список для всех сразу. Состав определяется по факту использования: смотрим, что конкретный потребитель реально импортирует, и переносим только это. Если два файла `@x/*` одной сущности пересекаются (например, `AlgoOrder` есть и в `@x/core.ts`, и в `@x/preset.ts`) — это нормально и не повод сводить их в один файл: это два независимых контракта для разных потребителей, которые могут меняться порознь (`core` перестанет использовать `AlgoOrder` — правим только `@x/core.ts`, `preset` это не касается).
3. Импортировать чужую сущность можно **только** из её `@x/{свой-слайс}`, никогда — из обычного `index.ts` слайса и тем более не напрямую из `model/*`.
4. Если то, чем сущность делится через `@x`, не имеет ID (enum, конфиг, набор полей без идентичности) и не является структурной частью сущности-потребителя — сначала проверьте, не место ли ему в `entities/shared` (раздел 3). `@x` — именно для случаев, когда потребитель ссылается на чужую сущность/её тип как на составную часть себя, а не переиспользует независимый VO.

```typescript
// src/entities/algo-order/@x/strategy.ts — публичный API algo-order именно для strategy
export type { AlgoOrder } from "../model/algo-order.types";
export type { PriceBasisType, PriceOffsetType } from "../model/type";
```

```typescript
// src/entities/algo-order/@x/preset.ts — другой набор, публичный API algo-order для preset
export { disbandAlgoOrdersByType } from "../lib/disbandAlgoOrdersByType";
export type { AlgoOrder, AlgoOrderConfig, AlgoOrderType } from "../model/algo-order.types";
```

```typescript
// src/entities/strategy/model/strategy-config.type.ts
import type { AlgoOrder } from "@/entities/algo-order/@x/strategy";
```

**Текущая карта `@x`-связей проекта** (обновлять при добавлении/удалении cross-import):

| Файл | Потребитель | Что отдаёт | Почему именно это |
|---|---|---|---|
| `algo-order/@x/strategy.ts` | `strategy` | `AlgoOrder`, `PriceBasisType`, `PriceOffsetType` | `StrategyConfig.algoOrders: AlgoOrder[]`; те же енамы использует `CoreEngine`/селекторы |
| `algo-order/@x/core.ts` | `core` | `AlgoOrder`, `groupAlgoOrdersByType`, `disbandAlgoOrdersByType` | тип ответа бэкенда + группировка при отправке / расформирование при маппинге ответа |
| `algo-order/@x/preset.ts` | `preset` | `AlgoOrder`, `AlgoOrderConfig`, `AlgoOrderType`, `disbandAlgoOrdersByType` | пресет хранит конфиг алго-ордера и его тип; `groupAlgoOrdersByType` preset не вызывает — в файле его нет |
| `strategy/@x/core.ts` | `core` | `CoreEngine`, `Meta`, `RateLimiter`, `StrategyConfig`, `DEFAULT_CORE_ENGINE`, `DEFAULT_META`, `DEFAULT_RATE_LIMITER` | `Core.config: StrategyConfig`; дефолты нужны в мапперe для `config === null` (сброс конфигов при миграции) |
| `doc-api/endpoint-request/@x/doc-api/endpoint/index.ts` | `doc-api/endpoint` | `BodyMode`, `RequestHeader` | `ImportEndpointRequest.headers`/`bodyMode` (набор «Try it», переносимый вместе с эндпоинтом при импорте) — та же форма, что и у `EndpointRequest` |
| `doc-api/endpoint/@x/doc-api/group/index.ts` | `doc-api/group` | `CreateEndpointDTO`, `Endpoint` | `Group.endpoints: Endpoint[]`; `CreateGroupDTO.endpoints: CreateEndpointDTO[]` — группа структурно состоит из эндпоинтов |
| `strategy/@x/preset.ts` | `preset` | `CoreEngine`, `Meta`, `RateLimiter`, `StrategyConfig` | пресет хранит `StrategyConfig` целиком; дефолты не использует — их в файле нет |
| `exchange/@x/strategy.ts` | `strategy` | `ExchangeId` | `CoreEngine.General.Exchange` типизирован как `ExchangeId` |

Правило: перед тем как добавить что-то в `@x/{consumer}.ts`, проверь — это реально нужно `{consumer}`, и обнови эту таблицу вместе с изменением.

---

## 5. Структура сущности

```
{entity}/
├── api/
│   ├── get-{entity}-api.ts
│   ├── create-{entity}-api.ts
│   ├── update-{entity}-api.ts
│   ├── delete-{entity}-api.ts
│   ├── get-{entities}-api.ts
│   └── types/
│       └── type.ts
├── lib/
├── model/
│   ├── {entity}.type.ts
│   ├── {entity}.dto.ts
│   └── {entity}.map.ts
├── store/
│   └── use{Entities}Store.ts
├── ui/
│   ├── {Entity}Select.tsx
│   └── {Entity}Input.tsx
└── index.ts
```

Сегменты `i18n` и `config` в слое `entities` **не используются**.

### 5.1. Сегмент `api`

Отвечает за взаимодействие с бэкендом. Полный стандарт файлов и правил этого сегмента — в [api.md](../api/api.md), здесь только сводка в контексте слоя.

- **`api/types/type.ts`** — тип ответа бэкенда в том виде, в котором он приходит с сервера: только `interface`, поля в `snake_case`, без `any` (для нетипизированного — `unknown`). Папка называется во множественном числе — `types/`.
- **Файлы запросов** (`get-{entity}-api.ts`, `get-{entities}-api.ts`, `create-{entity}-api.ts`, `update-{entity}-api.ts`, `delete-{entity}-api.ts`) — по одному файлу на операцию. Параметры передаются одним объектом `params: XxxParams`, не positional args. Функция всегда возвращает доменный тип из `model/{entity}.type.ts`; маппинг выполняется внутри неё, до возврата, через `map{Entity}` из `model/{entity}.map.ts`.

**Нейминг запросов:** по умолчанию получение сущности идёт по `id`. Если выбор по другому параметру — приставка `by` + имя параметра:

```
get-{entity}-by-{param}-api.ts     // пример: get-user-by-email-api.ts
```

Файлы сегмента `api` именуются в kebab-case — уникальный стиль этого сегмента, зафиксированный стандартом.

### 5.2. Сегмент `model`

Доменное ядро сущности. Формат файлов — как в [api.md](../api/api.md).

- **`model/{entity}.type.ts`** — доменный тип: поля в `camelCase`, фронтовое представление сущности.
- **`model/{entity}.dto.ts`** — объекты, описывающие входные параметры команд: только те поля, что реально уходят в тело запроса (payload для `create-…` / `update-…`), в `camelCase`. Сам парсинг этих данных выполняется в файлах запросов сегмента `api`.
- **`model/{entity}.map.ts`** — маппер `map{Entity}(raw: {Entity}ApiResponse): {Entity}`, направление всегда raw API-ответ → доменный тип. Один маппер — одна сущность; аргумент — конкретный API-тип, не `any`/`Record<string, unknown>`.
- **Схемы валидации** (zod и аналоги) живут в `model`.

### 5.3. Сегмент `store`

- Хуки, работающие с состоянием сущности: `use{Entities}Store.ts`.
- Направление зависимостей одностороннее: **`store` импортирует `model`, никогда наоборот**. Стор только оркестрирует состояние, вызывая функции из `model`; доменная логика в хуки не просачивается.

### 5.4. Сегмент `lib`

Чистые утилиты сущности **без доменного смысла** (форматирование, вспомогательные функции). Всё, что несёт доменные правила, — в `model`.

### 5.5. Сегмент `ui`

Только компоненты с простой логикой, **не связанные с другими сущностями**. Композиция нескольких сущностей — задача `features` / `widgets`. Если компоненту нужно отобразить чужую сущность — принимайте её через props / slots.

### 5.6. `index.ts`

Public API сущности. Экспортирует только нужное внешним потребителям; внутренние файлы (`api/type`, `model/{entity}.map.ts` и т.п.) наружу без необходимости не выходят.

---

## 6. Группы сущностей

**[исключение из FSD]** Тесно связанные сущности группируются в папку `{entity-group}/`. Группа имеет собственный `index.ts`, выполняющий роль **фабрики** — единой точки входа: внешний код получает доступ к сущностям группы только через него. Импорт вложенных сущностей в обход `index.ts` группы запрещён.

```
{entity-group}/
├── {entity}/        # структура из раздела 5
├── {entity}/
└── index.ts         # public API группы (фабрика)
```

---

## 7. Сводка правил импорта

| Откуда → Куда                       | Разрешено                          |
| ------------------------------------ | ----------------------------------- |
| `{entity}` → `entities/shared`       | ✅ через public API shared           |
| `{entity}` → `{другая entity}`       | ❌ (кроме `@x`, см. 4.1)             |
| `{entity}` → `{другая entity}/@x`    | ✅ только то, что объявлено в `@x`   |
| `store` → `model`                    | ✅                                   |
| `model` → `store`                    | ❌                                   |
| `entities/shared` → любая сущность   | ❌                                   |

---

## 8. Нейминг — сводка

|Что|Стиль|Пример|
|---|---|---|
|Файлы сегмента `api`|kebab-case|`create-order-api.ts`, `get-user-by-email-api.ts`|
|Тип ответа бэкенда|`api/types/type.ts`, только `interface`|`OrderApiResponse`|
|Доменный тип|суффикс `.type.ts`|`order.type.ts`|
|Мапперы|суффикс `.map.ts`|`order.map.ts`|
|Параметры команд|суффикс `.dto.ts`|`order.dto.ts`|
|Хуки стора|camelCase с `use`|`useOrdersStore.ts`|
|UI-компоненты|PascalCase|`OrderSelect.tsx`|

Суффикс `.entity.ts` в этом слое не используется — доменный тип называется по сущности: `{entity}.type.ts` (см. [api.md](../api/api.md)).

---

## 9. Автоматическая проверка

Правило «кросс-импорты между сущностями запрещены, кроме `@x`» проверяется
[Steiger](https://github.com/feature-sliced/steiger) — официальным линтером FSD,
который умеет распознавать `@x`-нотацию (правило `fsd/forbidden-imports`).

- Конфиг — `steiger.config.js` в корне репозитория: берётся весь `recommended`,
  точечно выключены 5 правил, конфликтующих с осознанными отступлениями
  проекта (`entities/shared`, группы сущностей, сегмент `store`) или не
  умеющих смотреть сквозь вложенные barrel-группы (`fsd/insignificant-slice`,
  `fsd/no-reserved-folder-names`, `fsd/no-segmentless-slices`,
  `fsd/repetitive-naming`, `fsd/segments-by-purpose`).
- Локально: `bun run lint:arch`.
- В CI: job `architecture` в `.github/workflows/lint.yml`, падает при новом
  кросс-импорте между сущностями в обход `@x`.
