# Конфигурация окружения (`envConfig`)

`envConfig` — типизированная обёртка над переменными окружения Vite (`import.meta.env.VITE_*`). Живёт в сегменте `shared/config` (слой `shared`, см. [../architecture.md](../architecture.md)).

```
src/shared/
├── config/
│   ├── env.ts        # envConfig — сборка объекта из import.meta.env
│   └── index.ts        # public API — export { envConfig }
└── model/
    └── env-type.ts    # EnvConfig, Env — типы
```

---

## 1. Тип `EnvConfig`

```typescript
// src/shared/model/env-type.ts
interface EnvConfig {
  env: Env;
  services: {
    {nameService}: string;
  };
  proxyTargets: {
    {nameService}: string;
  };
}

type Env = "production" | "local";
```

## 2. Сборка объекта (`env.ts`)

```typescript
// src/shared/config/env.ts
export const envConfig: EnvConfig = {
  env: import.meta.env.VITE_ENV,
  service: {
    {nameService}: import.meta.env.VITE_SERVICE_{NAME_SERVICE},
  },
  proxyTarget: {
    {nameService}: import.meta.env.VITE_SERVICE_{NAME_SERVICE}_PROXY_TARGET,
  },
};
```

## 3. Как добавить новую переменную

1. Добавить переменную в `.env`, `.env.production` и `.env.example` (с префиксом `VITE_`, иначе Vite её не подхватит).
2. Добавить поле в `EnvConfig` (`src/shared/model/env-type.ts`).
3. Замаппить его в `envConfig` (`src/shared/config/env.ts`).
4. Использовать через `import { envConfig } from "@/shared/config"` — не читать `import.meta.env` напрямую в вышестоящих слоях.
