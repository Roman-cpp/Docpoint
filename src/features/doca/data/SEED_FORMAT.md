# Seed Format Guide

Этот файл описывает структуру объектов в `seed.ts`. Используй его как эталон при задаче вида:
> "Проанализируй проект и запиши всю информацию по REST API в seed.ts с определённой структурой."

---

## Структура файла seed.ts

```ts
export const seedDoca: Doca = { ... }
export const seedGroups: Group[] = [ ... ]
export const seedSchema: Schema[] = [ ... ]
export const seedEnvConfigs: EnvConfig[] = [ ... ]
```

---

## seedDoca — общая информация об API

```ts
{
  id: string        // уникальный slug, напр. "core" или "payments-api"
  name: string      // человекочитаемое название, напр. "Core API"
  version: string   // версия, напр. "v2"
  desc: string      // краткое описание назначения API (1–2 предложения)
  tags: string[]    // ярлыки, напр. ["REST", "JSON", "Auth required"]
}
```

---

## seedGroups — группы эндпоинтов

Массив групп. Каждая группа объединяет логически связанные эндпоинты (напр. "Users", "Auth", "Articles").

```ts
{
  id: string        // slug группы, напр. "g-users"
  label: string     // название в сайдбаре, напр. "Users"
  endpoints: Endpoint[]
}
```

### Endpoint

```ts
{
  id: string           // уникальный slug, напр. "users-list"
  method: HttpMethod   // "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string         // путь с параметрами, напр. "/users/{id}"
  name: string         // короткое название, напр. "List all users"
  description: string  // подробное описание поведения, требований к auth, scope и т.д.
  tags: string[]       // ярлыки, напр. ["paginated", "auth-required", "public"]
  auth: boolean        // требует ли Bearer-токен
  queryParams: ParamDef[]
  bodyParams: ParamDef[]
  responses: Record<string, ResponseDef>
}
```

### ParamDef — параметр запроса (query или body)

```ts
{
  name: string       // имя параметра
  type: string       // тип: "string" | "integer" | "boolean" | "number" | "object" | "array"
  required: boolean  // обязательный ли
  desc: string       // описание назначения
  default?: string   // значение по умолчанию (строкой), если есть; "—" если нет смыслового дефолта
}
```

### ResponseDef — описание ответа на конкретный HTTP-статус

Ключ объекта `responses` — строковый код статуса: `"200"`, `"201"`, `"401"` и т.д.

```ts
{
  label: string         // напр. "200 OK" или "422 Validation"
  schema: SchemaField[] // поля ответа (см. ниже)
  example: string       // JSON-строка с реальным примером ответа (с \n для переносов)
}
```

### ResponseSchemaField — поле в теле ответа

```ts
{
  key: string       // путь к полю, напр. "data[].id" или "meta.total"
  type: string      // тип значения
  desc: string      // описание поля
  example?: string  // пример значения в виде строки, напр. '"Alice Smith"' или "142"
}
```

> Числа и булевы значения пиши без кавычек: `"142"`, `"true"`.
> Строки — с кавычками внутри: `'"editor"'`.

---

## seedSchema — модели данных (Data Schemas)

Массив моделей, которые описывают структуру объектов, возвращаемых или принимаемых API.

```ts
{
  id: string           // slug модели, напр. "user" или "article"
  name: string         // название, напр. "User"
  desc: string         // описание назначения модели (1–3 предложения)
  fields: SchemaField[]
  usedBy: UsedByItem[]
}
```

### SchemaField — поле модели

```ts
{
  name: string      // имя поля
  type: string      // "string" | "integer" | "boolean" | "uuid" | "datetime" |
                    // "enum" | "object" | "array" | "number"
  req: boolean      // обязательное ли поле
  nullable: boolean // может ли быть null
  desc: string      // описание поля
  note: string      // техническое примечание (ограничения, формат); "" если нечего добавить
  example: string   // пример значения (см. правила ниже)
  enum?: EnumValue[] // только если type === "enum"
}
```

#### Правила записи example

| Тип поля   | Пример записи               |
|------------|-----------------------------|
| `string`   | `'"Alice Smith"'`           |
| `uuid`     | `'"3fa85f64-..."'`          |
| `datetime` | `'"2025-03-14T10:22:00Z"'`  |
| `integer`  | `"7"`                       |
| `boolean`  | `"true"`                    |
| `enum`     | `'"published"'`             |
| `object`   | `'{ "id": "...", "name": "Alice" }'` |
| `array`    | `'[{ "slug": "helpers" }]'` |

### EnumValue — значение перечисления

```ts
{
  val: string   // значение, напр. "admin"
  desc: string  // что означает это значение
}
```

### UsedByItem — где используется модель

```ts
{
  method: string  // HTTP-метод, напр. "GET"
  path: string    // путь, напр. "/users/{id}"
  role: string    // роль в этом запросе: "response" | "response[]" | "request body" |
                  // "author field" | "parent context" | "filter param" | "target"
}
```

---

## seedEnvConfigs — окружения

```ts
{
  id: string      // уникальный идентификатор, напр. "1"
  env: string     // slug окружения: "prod" | "staging" | "local" | любое другое
  label: string   // название в UI, напр. "Prod"
  baseUrl: string // базовый URL API, напр. "https://api.example.com"
}
```

---

## Чеклист при заполнении seed.ts

- [ ] `seedDoca` заполнен: id, name, version, desc, tags
- [ ] Каждый эндпоинт имеет уникальный `id`
- [ ] У каждого эндпоинта заполнены оба массива: `queryParams` и `bodyParams` (пустой `[]` если нет)
- [ ] Для каждого возможного HTTP-статуса есть запись в `responses`
- [ ] `example` в ResponseDef — валидный JSON (символы переноса строки как `\n`)
- [ ] Каждая модель в `seedSchema` имеет `usedBy` — все эндпоинты, где она фигурирует
- [ ] Поля с `type: "enum"` содержат массив `enum`
- [ ] `seedEnvConfigs` содержит хотя бы одну запись
