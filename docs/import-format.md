# Формат файла импорта документации REST API

Файл `example-import.json` — пример JSON-файла для импорта документации REST API в Docpoint. Этот документ описывает структуру таких файлов, чтобы вы могли создавать свои.

## Общая структура

Корневой объект содержит четыре секции:

```json
{
  "doc":          { ... },   // мета-информация о документации
  "groups":       [ ... ],   // группы эндпоинтов (Auth, Users, Tasks и т. п.)
  "entities":     [ ... ],   // схемы сущностей (модели данных)
  "environments": [ ... ]    // окружения (prod / staging / local)
}
```

Все четыре секции обязательны. Если у вас нет данных для какой-то секции, передайте пустой массив (`[]`) или пустой объект.

---

## 1. `doc` — мета-информация

Описывает документацию в целом.

```json
"doc": {
  "name": "Task Manager API",
  "version": "v1",
  "desc": "REST API для управления задачами, проектами и пользователями.",
  "tags": ["REST", "JSON", "Auth required"]
}
```

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `name` | string | да | Название API |
| `version` | string | да | Версия (`v1`, `2.3.0` и т. п.) |
| `desc` | string | да | Краткое описание назначения API |
| `tags` | string[] | да | Метки для общей характеристики (могут быть пустым массивом) |

---

## 2. `groups` — группы эндпоинтов

Логическая группировка эндпоинтов (например, по ресурсу: `Auth`, `Users`, `Tasks`).

```json
"groups": [
  {
    "label": "Auth",
    "endpoints": [ ... ]
  }
]
```

### Группа

| Поле | Тип | Описание |
|------|-----|----------|
| `label` | string | Название группы, отображается в сайдбаре |
| `endpoints` | Endpoint[] | Массив эндпоинтов группы |

### Эндпоинт

```json
{
  "method": "POST",
  "path": "/auth/login",
  "name": "Login",
  "description": "Аутентификация пользователя...",
  "tags": ["public"],
  "auth": false,
  "queryParams": [],
  "bodyParams": [ ... ],
  "responses": { ... }
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `method` | string | HTTP-метод: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `path` | string | Путь эндпоинта (можно с параметрами: `/users/{id}`) |
| `name` | string | Человекочитаемое имя эндпоинта |
| `description` | string | Подробное описание |
| `tags` | string[] | Метки (`public`, `admin`, `paginated`, `destructive` и т. п.) |
| `auth` | boolean | `true`, если требуется аутентификация |
| `queryParams` | Param[] | Параметры строки запроса |
| `bodyParams` | Param[] | Параметры тела запроса |
| `responses` | Object | Возможные ответы, ключ — HTTP-код |

### Параметр (`queryParams` / `bodyParams`)

```json
{
  "name": "email",
  "type": "string",
  "required": true,
  "desc": "Email пользователя",
  "default": ""
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `name` | string | Имя параметра |
| `type` | string | Тип: `string`, `integer`, `boolean`, `uuid`, `datetime`, `object`, `array` |
| `required` | boolean | Обязателен ли параметр |
| `desc` | string | Описание назначения |
| `default` | string | Значение по умолчанию (пустая строка, если нет) |

### Ответ (`responses`)

Ключ объекта — HTTP-код (`"200"`, `"401"`, `"404"`, `"422"`, ...).

```json
"200": {
  "label": "200 OK",
  "schema": [
    { "key": "token", "type": "string", "desc": "JWT Bearer-токен", "example": "\"eyJhbGci...\"" },
    { "key": "expires_in", "type": "integer", "desc": "Срок жизни токена в секундах", "example": "3600" }
  ],
  "example": "{\n  \"token\": \"eyJhbGci...\",\n  \"expires_in\": 3600\n}"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `label` | string | Подпись ответа (обычно `"<код> <статус>"`) |
| `schema` | SchemaField[] | Описание полей ответа |
| `example` | string | Пример тела ответа в виде форматированной JSON-строки (используйте `\n` для переносов) |

#### Поле схемы (`schema[]`)

```json
{ "key": "data[].id", "type": "uuid", "desc": "UUID записи", "example": "\"3fa85f64-...\"" }
```

| Поле | Тип | Описание |
|------|-----|----------|
| `key` | string | Путь к полю. Поддерживает вложенность (`meta.total`) и массивы (`data[].id`) |
| `type` | string | Тип значения |
| `desc` | string | Описание поля |
| `example` | string | Пример значения (опционально). Строки оборачивайте кавычками внутри: `"\"text\""` |

Для пустых ответов (`204 No Content`) используйте `schema: []` и `example: ""`.

---

## 3. `entities` — модели данных

Описание сущностей, на которые ссылаются эндпоинты.

```json
{
  "name": "User",
  "desc": "Пользователь системы. Может иметь роль admin или member.",
  "fields": [ ... ]
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `name` | string | Имя сущности |
| `desc` | string | Описание |
| `fields` | Field[] | Поля сущности |

### Поле сущности

```json
{
  "name": "email",
  "type": "string",
  "req": true,
  "nullable": false,
  "desc": "Email-адрес (уникальный)",
  "note": "Формат RFC 5322",
  "example": "\"alice@example.com\""
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `name` | string | Имя поля |
| `type` | string | Тип: `string`, `integer`, `boolean`, `uuid`, `datetime`, `enum`, ... |
| `req` | boolean | Обязательное ли поле |
| `nullable` | boolean | Может ли быть `null` |
| `desc` | string | Описание |
| `note` | string | Дополнительные ограничения / комментарии (можно пустую строку) |
| `example` | string | Пример значения |
| `enum` | EnumValue[] | Только для `type: "enum"` — список допустимых значений |

### Значение enum

```json
{
  "name": "role",
  "type": "enum",
  ...
  "enum": [
    { "val": "admin",  "desc": "Полный доступ" },
    { "val": "member", "desc": "Доступ к задачам своих проектов" }
  ]
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `val` | string | Значение enum |
| `desc` | string | Что означает это значение |

---

## 4. `environments` — окружения

Список окружений (production / staging / local), между которыми переключается клиент.

```json
{
  "env": "prod",
  "label": "Production",
  "baseUrl": "https://api.example.com",
  "prefix": "",
  "value": [
    { "name": "API_KEY", "value": "prod-api-key-here" }
  ],
  "accessToken": null
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `env` | string | Идентификатор окружения (`prod`, `staging`, `local`) |
| `label` | string | Отображаемое название |
| `baseUrl` | string | Базовый URL API |
| `prefix` | string | Префикс пути, добавляется ко всем эндпоинтам (например, `/api`). Пустая строка — если префикса нет |
| `value` | Variable[] | Переменные окружения (см. ниже) |
| `accessToken` | string \| null | Токен доступа по умолчанию или `null` |

### Переменная окружения

```json
{ "name": "API_KEY", "value": "prod-api-key-here" }
```

| Поле | Тип | Описание |
|------|-----|----------|
| `name` | string | Имя переменной (можно использовать в запросах) |
| `value` | string | Значение |

---

## Чек-лист перед импортом

- [ ] JSON валиден (используйте линтер или `jq .`)
- [ ] У каждого эндпоинта есть `method`, `path`, `name`, `description`
- [ ] Все коды ответов — строки (`"200"`, не `200`)
- [ ] Поля `example` — это **строки**, а не объекты. JSON внутри экранируется (`\"`, `\n`)
- [ ] Каждая сущность, на которую ссылается схема, описана в `entities`
- [ ] У окружений уникальные значения `env`
- [ ] Пустые массивы передаются как `[]`, а не отсутствуют

## Минимальный шаблон

```json
{
  "doc": {
    "name": "My API",
    "version": "v1",
    "desc": "Краткое описание",
    "tags": []
  },
  "groups": [
    {
      "label": "Default",
      "endpoints": [
        {
          "method": "GET",
          "path": "/ping",
          "name": "Ping",
          "description": "Проверка доступности.",
          "tags": [],
          "auth": false,
          "queryParams": [],
          "bodyParams": [],
          "responses": {
            "200": {
              "label": "200 OK",
              "schema": [
                { "key": "status", "type": "string", "desc": "Статус", "example": "\"ok\"" }
              ],
              "example": "{\n  \"status\": \"ok\"\n}"
            }
          }
        }
      ]
    }
  ],
  "entities": [],
  "environments": [
    {
      "env": "local",
      "label": "Local",
      "baseUrl": "http://localhost:3000",
      "prefix": "",
      "value": [],
      "accessToken": null
    }
  ]
}
```

Полный пример доступен в [example-import.json](example-import.json).
