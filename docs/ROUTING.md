# Routing Architecture

Описание маршрутизации проекта для переноса в аналогичный проект.

## Стек

- **React Router v7** (createBrowserRouter)
- **Zustand** — хранилище сессии
- **Lazy loading** — все страницы загружаются лениво

---

## Структура файлов

```
src/
├── app/
│   ├── App.tsx                  # RouterProvider + глобальные провайдеры
│   └── route/
│       ├── route.tsx            # Конфигурация роутера
│       ├── loaders.ts           # Загрузчики-гарды
│       └── index.ts
├── core/auth/
│   ├── store/useSessionStore.ts # Zustand: user, accessToken, isAuth
│   └── lib/isAuth.ts           # Хелпер проверки авторизации
└── pages/
    ├── auth/                    # /login
    ├── dashboard/               # /dashboard
    ├── layout/                  # Layout-обёртка с Outlet
    └── profile/                 # /profile
```

---

## Карта маршрутов

```
/                   → redirect → /dashboard
│
├── /login          [guestLoader]  LoginPage
│
├── [authLoader]
│   ├── /dashboard              DashboardPage
│   │
│   └── Layout (Outlet)
│       └── /profile            ProfilePage
```

---

## Конфигурация роутера

**`src/app/route/route.tsx`**

```tsx
import { createBrowserRouter, redirect } from "react-router";
import { authLoader, guestLoader } from "./loaders";

export const router = createBrowserRouter([
  {
    path: "/",
    loader: () => redirect("/dashboard"),
    HydrateFallback: () => "Loader ...",
  },
  {
    // Защищённые маршруты
    loader: authLoader,
    HydrateFallback: () => "Loader ...",
    children: [
      {
        path: "/dashboard",
        lazy: async () => ({
          Component: (await import("@/pages/dashboard")).DashboardPage,
        }),
      },
      {
        // Layout-обёртка с Header + Outlet
        lazy: async () => ({
          Component: (await import("@/pages/layout")).Layout,
        }),
        children: [
          {
            path: "/profile",
            lazy: async () => ({
              Component: (await import("@/pages/profile")).ProfilePage,
            }),
          },
        ],
      },
    ],
  },
  {
    path: "/login",
    loader: guestLoader,
    HydrateFallback: () => "Loader ...",
    lazy: async () => ({
      Component: (await import("@/pages/auth")).LoginPage,
    }),
  },
]);
```

**`src/app/App.tsx`**

```tsx
import { RouterProvider } from "react-router";
import { router } from "./route";

export const App = () => (
  <RouterProvider router={router} />
);
```

---

## Гарды (Loaders)

**`src/app/route/loaders.ts`**

```ts
import { redirect } from "react-router";
import { useSessionStore } from "@/core/auth/store/useSessionStore";
import { isAuth } from "@/core/auth/lib/isAuth";

// Для защищённых маршрутов (/dashboard, /profile)
export const authLoader = async () => {
  const { accessToken, fetchToken, fetchUser } = useSessionStore.getState();

  if (!accessToken) {
    await fetchToken();                          // попытка refresh
    if (!useSessionStore.getState().accessToken) {
      await fetchUser();                         // попытка загрузить пользователя
    }
  }

  if (!useSessionStore.getState().accessToken) {
    return redirect("/login");
  }

  return null;
};

// Для гостевых маршрутов (/login)
export const guestLoader = () => {
  if (isAuth()) return redirect("/dashboard");
  return null;
};
```

---

## Хранилище сессии

**`src/core/auth/store/useSessionStore.ts`**

```ts
interface SessionStore {
  user: User | null;
  accessToken: string | null;
  isAuth: () => boolean;
  isLoading: boolean;

  fetchToken: () => Promise<void>;   // refresh token → обновить accessToken
  fetchUser: () => Promise<void>;    // загрузить пользователя
  setAuth: (user: User, token: string) => void;
  clearSession: () => void;          // выход: сбросить user + token
}
```

**`src/core/auth/lib/isAuth.ts`**

```ts
import { useSessionStore } from "../store/useSessionStore";

export const isAuth = () => Boolean(useSessionStore.getState().accessToken);
```

---

## Модель пользователя и роли

```ts
interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "trader";
}
```

**Ролевой доступ:**

| Раздел      | admin | trader |
|-------------|:-----:|:------:|
| Profile     | ✓     | ✓      |
| Security    | ✓     | ✓      |
| Diagnostics | ✓     | ✗      |

Проверка роли реализована на уровне компонента `ProfilePage`, не на уровне роутера.

---

## Layout-компоненты

### Основной Layout (`src/pages/layout/ui/Layout.tsx`)

Обёртка для маршрутов, требующих шапку.

```tsx
import { Outlet } from "react-router";
import { Header } from "@/widgets/header";

export const Layout = () => (
  <div>
    <Header />
    <main style={{ height: "calc(100vh - 130px)" }}>
      <Outlet />
    </main>
  </div>
);
```

### Dashboard Layout (`src/pages/dashboard/ui/Layout.tsx`)

Отдельный layout для страницы дашборда (шапка со своим меню виджетов).

---

## Навигация

### Header (`src/widgets/header/ui/Header.tsx`)

```tsx
import { Link, useNavigate } from "react-router";

// Статические ссылки
<Link to="/">Logo</Link>
<Link to="/dashboard">Dashboard</Link>

// Программная навигация
const navigate = useNavigate();
navigate("/profile");   // переход в профиль
navigate("/login");     // после logout
```

### Logout

```ts
import { useLogout } from "@/features/auth/logout";

const { logout } = useLogout();
// Внутри: clearSession() + navigate("/login")
```

---

## Поток авторизации

```
Открытие приложения
        │
        ▼
  authLoader запускается
        │
  accessToken есть? ──Нет──► fetchToken() (refresh)
        │                          │
       Да                    токен получен? ──Нет──► redirect /login
        │                          │
        │                         Да
        │◄──────────────────────────
        ▼
  Страница отрендерена

/login: guestLoader
  isAuth()? ──Да──► redirect /dashboard
      │
     Нет
      ▼
  LoginPage → submit → setAuth(user, token) → navigate("/dashboard")
```

---

## Что нужно воспроизвести в новом проекте

1. **Установить** `react-router` (v7)
2. **Создать** `useSessionStore` (Zustand) с полями `accessToken`, `user`, методами `fetchToken`, `setAuth`, `clearSession`
3. **Создать** `src/app/route/loaders.ts` с `authLoader` и `guestLoader`
4. **Настроить** `createBrowserRouter` с тремя ветками: redirect, protected, guest
5. **Обернуть** `App` в `<RouterProvider router={router} />`
6. **Реализовать** `Layout` с `<Outlet />` для маршрутов с общей шапкой
7. **Все страницы** подключать через `lazy` для code splitting

### Минимальная точка входа

```
/login    — публичная страница входа
/         — редирект на /dashboard
/dashboard — защищённая (authLoader)
```

Далее добавлять защищённые маршруты в массив `children` блока с `authLoader`.
