# Стандарт слоя `features` (FSD)

Область действия: `src/features/`. Стандарт основан на FSD 2.1 с осознанными отступлениями, помеченными как **[исключение из FSD]**.

Смежные документы: `docs/entities-layer-standard.md` (слой `entities`, на который `features` опирается), `docs/architecture/store/store-guide.md` (паттерн TanStack Query, используемый в model-слайсах).

---

## 1. Основные термины

**Домен** — верхний уровень `src/features/`, папка с предметной областью (`doc-api/`, `platform/`, `domain/`…). Объединяет несколько фича-слайсов, тесно связанных одним бизнес-объектом. Прямой аналог Entity Group в `entities` (`docs/entities-layer-standard.md`, раздел 6). Домен обязан иметь собственный public API.

**Фича-слайс** — папка с одним пользовательским действием (создать, отредактировать, удалить, импортировать) либо с состоянием домена (раздел 6.3). Единица работы слоя `features`.

**Public API** — файл `index.ts` в корне слайса и в корне домена, единственная официальная точка входа. Импорт внутренних файлов слайса или слайса в обход `index.ts` домена запрещён.

**Управляемый (controlled) слайс** — UI-слайс без собственных запросов: получает данные и результат действия через пропы (`onCreate`, `onSave`, `isSaving`), сама мутация выполняется на стороне вызывающего `pages`.

**Самодостаточный (connected) слайс** — UI-слайс, который сам вызывает мутацию — через хук `entities` или через стор-слайс своего домена; принимает минимум пропов (`open`, `onOpenChange`, целевой объект/id).

**Model-слайс** — фича-слайс, инкапсулирующий операцию как хук на `useQuery`/`useMutation` (TanStack Query), без собственного UI.

**Стор-слайс (workspace-state)** — фича-слайс, хранящий глобальный клиентский стор домена на Zustand (не действие, а состояние: выбранная сущность, история, фильтры).

---

## 2. Структура слоя

```
src/features/
├── {domain}/
│   ├── {action}-{noun}/            # UI- или model-слайс
│   │   └── index.ts
│   ├── {domain}-workspace-state/   # стор-слайс (опционально)
│   │   └── index.ts
│   └── index.ts                    # public API домена
└── {domain}/
    └── index.ts
```

---

## 3. Домены `[исключение из FSD]`

Двухуровневая структура домен → слайс — расширение FSD поверх обычных слайсов, введённое по аналогии с группами сущностей в `entities`.

1. Каждый домен обязан иметь `index.ts`, выполняющий роль **фабрики**: ре-экспортирует public API нужных слайсов. Это единственная точка входа в домен для `pages`/`widgets`.
2. Импорт слайса в обход `index.ts` домена запрещён:

```typescript
// Правильно
import { CreateDocApiModal, useDocApiStore } from "@/features/doc-api";

// Неправильно — обход public API домена
import { CreateDocApiModal } from "@/features/doc-api/create-doc-api";
```

3. Домены не импортируют друг друга. Композиция фич из разных доменов — задача `pages`/`widgets`.

---

## 4. Кросс-импорты внутри домена

Слайсы одного домена вправе переиспользовать друг друга, но только через public API соседа — относительным путём к его `index.ts`, а не во внутренние файлы (`store/*`, `model/*`):

```typescript
// src/features/doc-api/create-entity/ui/CreateEntityModal/CreateEntityModal.tsx
import { actionAddEntity, useDocApiStore } from "../../../doc-workspace-state";
```

Импорт слайсов между разными доменами запрещён (раздел 3, пункт 3).

---

## 5. Структура фича-слайса

```
{action}-{noun}/
├── api/
│   └── {action}Api.ts       # запрос к бэкенду, если у операции нет готовой api-функции в entities
├── model/
│   └── use{Action}.ts       # TanStack Query хук и/или другая логика без UI
├── lib/                     # чистые утилиты без домена (напр. сборка файла на экспорт)
├── store/                   # только у стор-слайсов, см. 6.3
├── ui/
│   └── {Component}/
│       ├── {Component}.tsx
│       └── index.ts
└── index.ts                 # public API слайса
```

Слайс использует только нужные ему сегменты — UI-слайс (раздел 6.1–6.2) не имеет `api`/`model`/`store`, model-слайс (6.4) может не иметь `ui`. Пустые сегменты не создаются «про запас».

### 5.1. `api`

Функция-запрос к бэкенду, специфичная для этой операции. Заводится в слайсе, только если подходящей api-функции ещё нет в `entities`; если есть — слайс импортирует её оттуда напрямую, не дублируя.

### 5.2. `model`

Хуки без UI: TanStack Query обёртка операции (раздел 6.4) либо произвольная клиентская логика (debounce-автосохранение, обработчики контекстного меню и т. п.).

### 5.3. `lib`

Чистые утилиты без доменного смысла, используемые только внутри слайса.

### 5.4. `store`

Zustand-стор домена. Используется исключительно в стор-слайсах (раздел 6.3), не в обычных action-слайсах.

### 5.5. `ui`

Компонент действия. Практически всегда модальное окно: `{Action}{Noun}Modal.tsx` для отдельных операций (`CreateDocApiModal`, `DeleteEntityModal`) либо один `{Noun}Modal.tsx` на create+edit сразу, различающий режим по наличию пропа сущности (`PlatformModal`, `DomainModal` — см. 6.1).

### 5.6. `index.ts`

Public API слайса — реэкспортирует компонент/хук/стор, нужные домену и внешним потребителям.

---

## 6. Типы слайсов

### 6.1. Controlled UI-слайс

Слайс = компонент формы/модалки в `ui/`, без сегментов `api`/`model`/`store`. Мутацию выполняет вызывающий `pages`-компонент через хук `entities`; слайс получает результат через колбэки-пропы (`onCreate`, `onUpdate`, `onSave`) и флаг `isSaving`.

Используется, когда после успешной операции нужна дополнительная оркестрация на странице (инвалидация конкретных query-ключей, прикрепление созданной сущности к другой, закрытие смежного состояния) — как правило, для create/edit-модалок: `CreateDocApiModal`, `EditDocApiModal`, `EditEntityModal`, `PlatformModal`, `DomainModal`.

Один компонент может обслуживать оба режима (create + edit) сразу — режим определяется наличием опционального пропа сущности:

```typescript
interface PlatformModalProps {
  platform?: Platform | null;   // есть — edit, нет — create
  onCreate?: (dto: CreatePlatformDTO) => void;
  onUpdate?: (dto: UpdatePlatformDTO) => void;
}
```

### 6.2. Connected UI-слайс

Слайс сам вызывает мутацию — из `entities` (`use{Entity}Store`) либо из стор-слайса своего домена (`use{Domain}Store` + `action{Name}`). Пропы минимальны: `open`, `onOpenChange`, целевой объект/id.

Используется для операций без дополнительной оркестрации после успеха — типично для confirm-and-delete: `DeleteDocApiModal` (→ `useDocsStore` из `entities`), `DeletePlatformModal` (→ `usePlatformsStore` из `entities`), `DeleteEntityModal`, `DeleteGroupModal`, `CreateEntityModal` (→ `useDocApiStore` из своего домена).

### 6.3. Model-слайс

Слайс без UI: один хук на `useQuery`/`useMutation` со своим объектом query-keys, по паттерну `docs/architecture/store/store-guide.md` (Query Keys → параметры → `useQuery`/`useMutation` → плоский возвращаемый объект). Может иметь собственный `api/`, если подходящей api-функции нет в `entities`.

Примеры: `list-domain-docs` (`useDomainDocs`), `list-platform-docs` (`usePlatformDocs`), `import-export-doc` (`useImportExportDoc` + `lib/exportDoc.ts`), `edit-doc-api-content` (`useDocApiContent`), `markdown/create-markdown-file` (`useNewMarkdownFile`).

### 6.4. Стор-слайс (workspace-state) `[исключение из FSD]`

Слайс с суффиксом `-workspace-state` / `-history-state` / `-response-state`, хранящий Zustand-стор домена целиком (не отдельное действие). Обязательные три файла в `store/`:

```
{domain}-workspace-state/
└── store/
    ├── use{Domain}Store.ts        # State + Actions в одном StateCreator,
    │                               # обычно с persist + devtools
    ├── {domain}Store.actions.ts   # action{Name}(state) => state.{name}
    └── {domain}Store.selectors.ts # select{Field}(state) => state.{field}
```

- **`use{Domain}Store.ts`** — вся бизнес-логика стора: состояние, экшены, side-эффекты (запросы, оптимистичные обновления) внутри `StateCreator`.
- **`{domain}Store.actions.ts` / `{domain}Store.selectors.ts`** — точечные селекторы для `useStore(actionX)` / `useStore(selectY)`. Никакой логики не содержат, только `(state) => state.field`. Нужны, чтобы компонент подписывался на конкретный кусок стора и не перерендеривался на чужих изменениях.

Примеры: `doc-workspace-state`, `environment-workspace-state`, `platform-workspace-state`, `request-history-state`, `request-response-state`.

---

## 7. Сводка правил импорта

| Откуда → Куда | Разрешено |
|---|---|
| `{домен}/{слайс}` → `entities/*` | ✅, в т. ч. из нескольких сущностей сразу (композиция — задача `features`) |
| `{домен}/{слайс}` → сосед по тому же домену | ✅, только через `index.ts` соседа (раздел 4) |
| `{домен-A}` → `{домен-B}` | ❌ |
| `{домен}/{слайс}` (внутренние файлы) → извне слайса | ❌, только через `index.ts` слайса |
| `pages`/`widgets` → `{домен}/{слайс}` напрямую | ❌, только через `{домен}/index.ts` |

---

## 8. Нейминг — сводка

| Что | Стиль | Пример |
|---|---|---|
| Папка домена | kebab-case, существительное | `doc-api/`, `platform/` |
| Папка action/model-слайса | kebab-case, `{глагол}-{существительное}` | `create-doc-api/`, `delete-group/`, `list-domain-docs/` |
| Папка стор-слайса | kebab-case, `{домен}-workspace-state` / `-history-state` / `-response-state` | `doc-workspace-state/` |
| Компонент действия | PascalCase, суффикс `Modal` | `CreateDocApiModal.tsx`, `EditEntityModal.tsx` |
| TanStack Query хук | camelCase с `use`, по названию операции | `useDomainDocs`, `useImportExportDoc` |
| Zustand-стор домена | camelCase, `use` + `Store` | `useDocApiStore`, `useRequestStore` |
| Селекторы стора | `select{Field}` | `selectSelectedEntity`, `selectFilters` |
| Экшены стора | `action{Name}` | `actionAddEntity`, `actionDeleteGroup` |
| Query keys | `{domain}Keys`, иерархия `all → lists/byX → list/detail` | `domainDocsKeys`, `docWebsocketKeys` |

---

## 9. Актуальный состав доменов

| Домен | Слайсы |
|---|---|
| `doc-api/` | `create-doc-api`, `create-entity`, `delete-doc-api`, `delete-entity`, `delete-group`, `doc-workspace-state`, `edit-doc-api`, `edit-doc-api-content`, `edit-entity`, `import-export-doc` |
| `environment/` | `environment-workspace-state` |
| `markdown/` | `create-markdown-file` |
| `platform/` | `create-platform`, `delete-platform`, `list-platform-docs`, `platform-workspace-state` |
| `request/` | `request-history-state`, `request-response-state` |
| `domain/` | `create-domain`, `list-domain-docs` |

> Таблица «Фичи» в `CLAUDE.md` (`algo-order`, `auth`, `core`, `preset`, `realtime`, `trading-account`) относится к шаблону/другому проекту и не соответствует текущему составу `src/features` — актуальный список см. выше.
