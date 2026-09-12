# API


## 1. Текущая структура

### Расположение файлов

```
src/entities/{entity}/
├── api/
│   ├── get-{entity}-api.ts
│   ├── create-{entity}-api.ts
│   ├── update-{entity}-api.ts
│   ├── delete-{entity}-api.ts
│   └── types/                     
│       └── type.ts
├── model/
│   ├── {entity}.type.ts          ← доменные типы (camelCase)
│   ├── {entity}.dto.ts           ← DTO для запросов
│   └── {entity}.map.ts           ← маппинг API → домен
└── index.ts                      ← публичный экспорт
```


## 2. Стандартная структура (принятая практика)

### 2.1. Файл API-функции

```typescript
// src/entities/{entity}/api/get-{entity}-api.ts

import { axiosClientCentralManager } from "@/core/http-client";
import { map{Entity} } from "../model/{entity}.map";
import type { {Entity} } from "../model/{entity}.type";
import type { {Entity}ApiResponse } from "./types/type";

interface Get{Entity}Params {
  id: string;
  // остальные параметры
}

export async function get{Entity}Api(params: Get{Entity}Params): Promise<{Entity}> {
  const response = await axiosClientCentralManager.get<{Entity}ApiResponse>(`/{entities}/${params.id}`);
  return map{Entity}(response.data.data);  // или response.data — зависит от формата бэкенда
}
```

**Правила:**
- Функция всегда возвращает **доменный тип**, не `HttpSuccessResponse`
- Параметры передаются одним объектом `params: XxxParams` (не positional args)
- Маппинг всегда выполняется внутри API-функции, до возврата

### 2.2. Файл API-типов (ответ бэкенда)

```typescript
// src/entities/{entity}/api/types/type.ts  ← всегда "types" (мн.ч.)

export interface {Entity}ApiResponse {
  id: string;           // snake_case как приходит с бэкенда
  some_field: string;
  nested_object: {
    inner_field: number;
  };
}
```

**Правила:**
- Только `interface`, не `type`
- Поля в `snake_case` — как возвращает бэкенд
- Не использовать `any`, только `unknown` для нетипизированных данных

### 2.3. Доменные типы

```typescript
// src/entities/{entity}/model/{entity}.type.ts

export interface {Entity} {
  id: string;         // camelCase — фронтовое представление
  someField: string;
  nestedObject: {
    innerField: number;
  };
}
```

### 2.4. DTO для запросов

```typescript
// src/entities/{entity}/model/{entity}.dto.ts

export interface Create{Entity}DTO {
  // Только те поля, которые реально отправляются в запросе (в camelCase)
  alias: string;
  apiKey: string;
  secretKey: string;
  passphrase?: string;
}

export interface Update{Entity}DTO {
  name: string;
}
```


### 2.5. Маппер

```typescript
// src/entities/{entity}/model/{entity}.map.ts

import type { {Entity}ApiResponse } from "../api/types/type";
import type { {Entity} } from "./{entity}.type";

export function map{Entity}(raw: {Entity}ApiResponse): {Entity} {
  return {
    id: raw.id,
    someField: raw.some_field,
    nestedObject: {
      innerField: raw.nested_object.inner_field,
    },
  };
}
```

**Правила:**
- Аргумент — конкретный API-тип, не `any` или `Record<string, unknown>`
- Конвертация типов только там, где необходима (строка → число: `parseFloat()`)
- Один маппер = одна сущность (не смешивать несколько сущностей)

---

## 3. Шаблон создания нового API

### Шаг 1 — Тип ответа бэкенда

```typescript
// src/entities/foo/api/types/type.ts
export interface FooApiResponse {
  foo_id: string;
  bar_name: string;
  created_at: string;
}
```

### Шаг 2 — Доменный тип

```typescript
// src/entities/foo/model/foo.type.ts
export interface Foo {
  id: string;
  barName: string;
  createdAt: string;
}
```

### Шаг 3 — DTO (если нужен POST/PUT)

```typescript
// src/entities/foo/model/foo.dto.ts
export interface CreateFooDTO {
  barName: string;  // ← только то, что реально уйдёт в тело запроса
}
```

### Шаг 4 — Маппер

```typescript
// src/entities/foo/model/foo.map.ts
import type { FooApiResponse } from "../api/types/type";
import type { Foo } from "./foo.type";

export function mapFoo(raw: FooApiResponse): Foo {
  return {
    id: raw.foo_id,
    barName: raw.bar_name,
    createdAt: raw.created_at,
  };
}
```

### Шаг 5 — API-функция

```typescript
// src/entities/foo/api/get-foo-api.ts
import { axiosClientCentralManager } from "@/core/http-client";
import { mapFoo } from "../model/foo.map";
import type { Foo } from "../model/foo.type";
import type { FooApiResponse } from "./types/type";

interface GetFooParams {
  fooId: string;
}

export async function getFooApi(params: GetFooParams): Promise<Foo> {
  const response = await axiosClientCentralManager.get<{ data: FooApiResponse }>(
    `/foos/${params.fooId}`,
  );
  return mapFoo(response.data.data);
}
```

```typescript
// src/entities/foo/api/create-foo-api.ts
import { axiosClientCentralManager } from "@/core/http-client";
import { mapFoo } from "../model/foo.map";
import type { Foo } from "../model/foo.type";
import type { CreateFooDTO } from "../model/foo.dto";
import type { FooApiResponse } from "./types/type";

export async function createFooApi(dto: CreateFooDTO): Promise<Foo> {
  const response = await axiosClientCentralManager.post<{ data: FooApiResponse }>("/foos", {
    bar_name: dto.barName,  // snake_case для бэкенда
  });
  return mapFoo(response.data.data);
}
```

### Шаг 6 — Экспорт через index.ts

```typescript
// src/entities/foo/index.ts
export { getFooApi } from "./api/get-foo-api";
export { createFooApi } from "./api/create-foo-api";
export type { Foo } from "./model/foo.type";
export type { CreateFooDTO } from "./model/foo.dto";
```

---
