# Маршрутизация

Роутинг построен на **React Router v7** (`createBrowserRouter`). Вся конфигурация живёт в `src/app/route/` (сегмент слоя `app`, см. [app-layer.md](../layers/app-layer.md)).

```
src/app/route/
├── route.tsx     # дерево маршрутов
├── loaders.ts     # защита маршрутов (auth / guest)
└── index.ts        # public API — export { router }
```

---

## 1. Дерево маршрутов

```
/                                    redirect → /dashboard  (index route)
│
├── loader: authLoader                защищённая ветка
│   ├── /dashboard                    lazy → pages/dashboard  (DashboardPage)
│   └── lazy → widgets/layout (Layout)  общий layout с Header
│       └── /profile                  lazy → pages/profile  (ProfilePage)
│
└── /login                            loader: guestLoader, lazy → pages/auth (LoginPage)
```

Все маршруты (кроме индексного редиректа) имеют `HydrateFallback: () => <>Loader ...</>` — заглушку на время загрузки лениво подключаемого модуля/лоадера.

---

## 2. Защита маршрутов (`loaders.ts`)

Доступ к веткам роутера регулируется лоадерами `react-router`, которые работают через `useSessionStore` (`core/auth`) **до** рендера маршрута.

## 3. Ленивая загрузка страниц

Компонент страницы всегда подключается через `lazy`, а не статический импорт — это даёт код-сплиттинг по страницам:

```typescript
{
  path: "dashboard",
  lazy: async () => ({
    Component: (await import("@/pages/dashboard")).DashboardPage,
  }),
}
```

**Правила:**
- Импорт — только через public API страницы (`@/pages/{page}`), не из её внутренних файлов.
- Один маршрут — один `lazy` блок, возвращающий `{ Component }`.

---

## 4. Общий layout

Маршруты, которым нужен общий каркас (сейчас — `/profile`), группируются под безpath-маршрутом с `lazy`-компонентом layout'а:

```typescript
{
  lazy: async () => ({
    Component: (await import("@/widgets/layout")).Layout,
  }),
  children: [
    { path: "profile", lazy: async () => ({ Component: (await import("@/pages/profile")).ProfilePage }) },
  ],
}
```

`Layout` (`src/widgets/layout/ui/Layout.tsx`) рендерит `Header` и `<Outlet />` для дочерних маршрутов. Новый маршрут с общим header'ом добавляется как дочерний к этой ветке; маршрут без общего layout'а (как `/dashboard`) объявляется на верхнем уровне защищённой ветки напрямую.

---

## 5. Public API

`route/index.ts` экспортирует наружу только сам роутер:

```typescript
export { router } from "./route";
```

Наружу сегмента `route` попадает только `router` — `loaders.ts` и внутренняя структура `route.tsx` наружу не отдаются.

---

## 6. Как добавить новый маршрут

1. Определить, нужна ли защита — под `authLoader`, `guestLoader` или без лоадера.
2. Определить, нужен ли общий layout — добавить как дочерний к ветке с `widgets/layout`, либо на верхний уровень.
3. Подключить страницу через `lazy` и её public API (`@/pages/{page}`), а не напрямую компонент из `ui/`.
4. Страница должна уже существовать как слайс `pages` со своим `index.ts` (см. [pages-layer.md](../layers/pages-layer.md)).
