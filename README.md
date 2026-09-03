# Docpoint

Настольное приложение для документирования и отладки API. Работает целиком
локально: данные лежат в SQLite и файлах рядом с ней, сервер не нужен.

## Что умеет

Документы собраны в платформы. У каждой платформы своё дерево каталогов, в
котором лежат документы разных видов:

| Вид документа | Что это |
| --- | --- |
| doc-api | Описание HTTP API: группы эндпоинтов, параметры, ответы со схемой и примером, панель «Try it» для живых запросов |
| WebSocket | Адрес подключения, примеры кадров и консоль для обмена сообщениями |
| ERD | Диаграмма сущностей с полями и связями, импорт схемы из PostgreSQL или MySQL |
| Markdown | Заметка с редактором, подсветкой кода и оглавлением |
| Файл | Любой файл с диска, открывается системной программой |

К платформе привязаны окружения: base URL, префикс, авторизация и прокси.
Запросы из «Try it» уходят через выбранное окружение. Отдельно есть HTTP-клиент
с историей, WebSocket-клиент, просмотрщик JSON и конвертер unix-времени.

## Стек

| Слой | Технологии |
| --- | --- |
| Оболочка | Tauri 2, Rust |
| Хранилище | SQLite через sqlx, миграции в `src-tauri/migrations` |
| Интерфейс | React 19, TypeScript, Vite, React Router 7 |
| Состояние | Zustand, TanStack Query 5 |
| Формы | React Hook Form |
| Редакторы | CodeMirror 6, react-markdown, Shiki |
| Линтер | Biome |

Фронтенд организован по Feature-Sliced Design, подробности в `CLAUDE.md` и
`docs/architecture.md`. Бэкенд в `src-tauri/src` разделён на `domain`,
`repository`, `service` и `infrastructure`.

## Локальная разработка

### Что нужно

- Rust stable и Cargo
- Bun. Скрипты Tauri вызывают `bun run dev` и `bun run build`, менеджер пакетов
  зафиксирован в `bun.lock`
- Системные зависимости Tauri 2 для вашей ОС, см.
  [prerequisites](https://v2.tauri.app/start/prerequisites/). На Linux это
  webkit2gtk-4.1, libappindicator, librsvg и сборочные инструменты

### Первый запуск

```bash
bun install
bun run tauri dev
```

Tauri поднимает Vite на `http://localhost:1420`, собирает Rust-часть и
открывает окно приложения. Миграции базы применяются при старте.

На Linux с WebKitGTK окно может открыться пустым или с артефактами. Тогда
отключите DMA-BUF рендерер:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 bun run tauri dev
```

### Где лежат данные

Каталог данных приложения Tauri, на Linux это
`~/.local/share/com.roman.docpoint`:

| Путь | Содержимое |
| --- | --- |
| `docpoint.db` | База SQLite |
| `content/` | Тела markdown и doc-api документов |
| `files/` | Загруженные в дерево файлы |
| `logs/docpoint.log` | Лог приложения, туда пишут и Rust, и webview |

Чтобы начать с чистой базы, удалите файл базы, при следующем запуске она
создастся заново:

```bash
rm ~/.local/share/com.roman.docpoint/docpoint.db
```

### Проверки

```bash
bun run lint            # Biome, с автоисправлением
npx tsc --noEmit        # проверка типов фронтенда
cd src-tauri && cargo test   # тесты бэкенда, включая прогон миграций
```

### Storybook

Компоненты UI-кита имеют истории:

```bash
bun run storybook
```

Откроется на `http://localhost:6006`.

### Сборка

```bash
bun run tauri build
```

Установочные пакеты появятся в `src-tauri/target/release/bundle`.

## Структура репозитория

```text
src/              фронтенд, слои FSD: app, pages, widgets, features, entities, core, shared
src-tauri/        Rust-бэкенд и конфигурация Tauri
  migrations/     SQL-миграции, применяются по порядку номеров
  src/domain/     сущности, DTO и контракты репозиториев
  src/repository/ реализации на SQLite и файловой системе
  src/service/    tauri-команды, которые вызывает фронтенд
docs/             архитектурные заметки и стандарты слоёв
wasm/             Rust-крейты, собираемые в WebAssembly для фронтенда
```
