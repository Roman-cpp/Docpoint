# Стандарт слоя `pages` (FSD)

Область действия: `src/pages/`. Стандарт основан на FSD 2.1 с осознанными отступлениями, помеченными как **[исключение из FSD]**.

---

## 1. Структура слоя

```
src/pages/
├── {page}/
│   ├── ui/
│   │   └── {Page}Page.tsx
│   └── index.ts
├── {page}/
│   └── ...
```

Каждая страница — папка `src/pages/{page}/` (kebab-case) с сегментом `ui/` и обязательным `index.ts`.

---

## 2. Структура страницы

```
{page}/
├── ui/
│   └── {Page}Page.tsx
└── index.ts
```

Сегменты `api`, `model`, `store`, `lib` в `pages` практически не используются — вся работа с данными идёт через `entities`/`features`, которые страница только связывает между собой. Сегменты `i18n` и `config` в слое `pages` не используются.

### 2.1. Сегмент `ui`

Компонент(ы) страницы. Основной компонент называется `{Page}Page.tsx` (например, `DashboardPage.tsx`, `ProfilePage.tsx`, `LoginPage.tsx`).

### 2.2. `index.ts`

Public API страницы. Экспортирует только компонент-страницу:

```typescript
export { DashboardPage } from "./ui/DashboardPage";
```

---

## 3. Правила импорта

| Откуда → Куда                  | Разрешено |
| ------------------------------- | --------- |
| `{page}` → `widgets`            | ✅ через public API |
| `{page}` → `features`           | ✅ через public API |
| `{page}` → `entities`           | ✅ через public API |
| `{page}` → `core`, `shared`     | ✅ через public API |
| `{page}` → `{другая page}`      | ❌ |
| Слои выше (`app`) → `{page}`    | ✅ через public API страницы |

Композиция нескольких доменных сущностей или фич в разметке — задача страницы; сама доменная логика в `pages` не переносится.

---

## 4. Нейминг — сводка

| Что | Стиль | Пример |
| --- | --- | --- |
| Папка страницы | kebab-case | `dashboard/`, `auth/` |
| Компонент страницы | PascalCase, суффикс `Page` | `DashboardPage.tsx`, `LoginPage.tsx` |
