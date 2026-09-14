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

Фронтенд организован по Feature-Sliced Design, слои и правило импортов
описаны в `CLAUDE.md`. Бэкенд в `src-tauri/src` разделён на `domain`,
`repository`, `service` и `infrastructure`.

## Локальная разработка

### Что нужно

- Rust 1.88 или новее и Cargo (минимальная версия зафиксирована в
  `src-tauri/Cargo.toml`)
- Bun. Скрипты Tauri вызывают `bun run dev` и `bun run build`, менеджер пакетов
  зафиксирован в `bun.lock`
- Системные зависимости Tauri 2 для вашей ОС, см.
  [prerequisites](https://v2.tauri.app/start/prerequisites/). На Linux это
  webkit2gtk-4.1, libappindicator, librsvg и сборочные инструменты
- `wasm-pack` и target `wasm32-unknown-unknown`: часть фронтенда собирается из
  Rust в WebAssembly

  ```bash
  rustup target add wasm32-unknown-unknown
  cargo install wasm-pack
  ```

### Первый запуск

```bash
bun install
bun run wasm
bun run tauri dev
```

`bun run wasm` собирает крейт из `wasm/crates/canvas` в `wasm/pkg`. Папка не
хранится в git, поэтому шаг нужен после клонирования и после правок в
`wasm/`. Tauri поднимает Vite на `http://localhost:1420`, собирает Rust-часть и
открывает окно приложения. Миграции базы применяются при старте.

На Linux с WebKitGTK окно может открыться пустым или с артефактами: DMABUF-путь
рендерера не работает с проприетарным драйвером NVIDIA. Приложение определяет
такой драйвер само и выставляет `WEBKIT_DISABLE_DMABUF_RENDERER=1` до старта
webview — см. `src-tauri/src/webkit.rs`, в логе это строка «драйвер NVIDIA».

Если окно всё равно пустое на другой видеокарте, отключите рендерер вручную:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 bun run tauri dev
```

Заданная снаружи переменная имеет приоритет, поэтому обратно DMABUF включается
пустым значением: `WEBKIT_DISABLE_DMABUF_RENDERER= bun run tauri dev`.

### Где лежат данные

Каталог данных приложения Tauri, на Linux это
`~/.local/share/io.github.roman-cpp.docpoint`:

| Путь | Содержимое |
| --- | --- |
| `docpoint.db` | База SQLite |
| `content/` | Тела markdown и doc-api документов |
| `files/` | Загруженные в дерево файлы |
| `logs/docpoint.log` | Лог приложения, туда пишут и Rust, и webview |

Чтобы начать с чистой базы, удалите файл базы, при следующем запуске она
создастся заново:

```bash
rm ~/.local/share/io.github.roman-cpp.docpoint/docpoint.db
```

Если вы ставили сборку до открытия исходников, она жила под идентификатором
`com.roman.docpoint` и держала данные в соседнем каталоге. При первом запуске
новой версии база, `content/` и `files/` переезжают сами; кеши webview
остаются на старом месте и старый каталог можно удалить. Перенос виден в логе
строками «перенесено из com.roman.docpoint».

### Проверки

```bash
bun run lint            # Biome, с автоисправлением
npx tsc --noEmit        # проверка типов фронтенда
cd src-tauri && cargo test   # тесты бэкенда, включая прогон миграций
```

### Сборка

```bash
bun run tauri build
```

Перед сборкой фронтенда Tauri сам пересобирает wasm, это задано в
`beforeBuildCommand`. Установочные пакеты появятся в
`src-tauri/target/release/bundle`.

На дистрибутивах со свежим binutils (Arch и подобные) шаг AppImage падает с
`failed to run linuxdeploy`. Причина не в проекте: linuxdeploy зовёт свой
встроенный `strip`, а тот не понимает секцию `.relr.dyn` в системных
библиотеках и валится на каждой из них. Лечится отключением strip:

```bash
NO_STRIP=true bun run tauri build
```

Формат можно выбрать и точечно, тогда AppImage вообще не собирается:

```bash
bun run tauri build --bundles deb        # или rpm, appimage
bun run tauri build --no-bundle          # только бинарник
```

Иконка приложения рисуется в `app-icon.svg`. После правки исходника набор для
всех платформ пересобирается одной командой, мобильные каталоги проекту не
нужны и удаляются:

```bash
bunx tauri icon app-icon.svg
rm -rf src-tauri/icons/ios src-tauri/icons/android
cp src-tauri/icons/32x32.png public/icon.png   # favicon окна
```

### Релиз

Пакеты собирает GitHub Actions, `.github/workflows/release.yml`. Порядок:

1. Поднять версию в `package.json`, `src-tauri/tauri.conf.json` и
   `src-tauri/Cargo.toml`.
2. Влить изменения в `main`.
3. Поставить тег с той же версией и отправить его:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

Workflow проверяет, что тег совпадает с версией в `tauri.conf.json` и что
помеченный коммит есть в истории `main` — тег с ветки сборку не запустит.
Дальше он собирает файлы, публикует релиз на GitHub и складывает в его описание
таблицу со ссылками на скачивание и контрольные суммы. Черновик не создаётся:
ссылки живые сразу после прогона.

| Файл | Как ставится |
| --- | --- |
| `Docpoint-<версия>-arch-x86_64.pkg.tar.zst` | `sudo pacman -U …` |
| `Docpoint-<версия>-arch-x86_64.tar.gz` | распаковать, внутри бинарник, `.desktop` и иконки |
| `Docpoint-<версия>-linux-x86_64.deb` | `sudo apt install ./…` |
| `Docpoint-<версия>-linux-x86_64.AppImage` | `chmod +x`, запустить |
| `Docpoint-<версия>-windows-x86_64-setup.exe` | установщик NSIS |
| `Docpoint-<версия>-windows-x86_64.msi` | установщик MSI |

Сборки для Arch идут в контейнере `archlinux:latest`, поэтому бинарник линкуется
с теми же версиями webkit2gtk и glibc, что стоят в системе. Пакет описан в
`packaging/arch/PKGBUILD`, `.desktop` — в `packaging/linux`. Остальные Linux-файлы
собираются на ubuntu-22.04 ради совместимости со старым glibc.

Тот же workflow можно запустить вручную со страницы Actions: файлы соберутся и
останутся артефактами прогона, релиз при этом не создаётся. Сборки не подписаны,
Windows покажет предупреждение SmartScreen.

## Структура репозитория

```text
app-icon.svg      исходник иконки приложения
src/              фронтенд, слои FSD: app, pages, widgets, features, entities, core, shared
src-tauri/        Rust-бэкенд и конфигурация Tauri
  migrations/     SQL-миграции, применяются по порядку номеров
  src/commands/   tauri-команды, которые вызывает фронтенд
  src/service/    сценарии работы: один файл на операцию
  src/domain/     сущности, DTO и контракты репозиториев
  src/repository/ реализации на SQLite и файловой системе
  src/infrastructure/ HTTP- и WebSocket-клиенты, импорт схем из внешних БД
docs/import/      форматы импорта и экспорта с примерами
wasm/             Rust-крейты, собираемые в WebAssembly для фронтенда
packaging/        PKGBUILD для Arch и общий .desktop для Linux
```

## Как помочь

Правила для issue, веток, коммитов и pull request собраны в
`CONTRIBUTING.md`.

## Лицензия

Copyright (C) 2026 Roman Arlamov <roman.arlamov2002@yandex.ru>

Docpoint распространяется под GNU Affero General Public License версии 3 или
любой более поздней, SPDX-идентификатор `AGPL-3.0-or-later`. Полный текст в
файле `LICENSE`. Исходный код: <https://github.com/Roman-cpp/Docpoint>.

Программа распространяется в надежде, что будет полезной, но БЕЗ КАКИХ-ЛИБО
ГАРАНТИЙ, включая подразумеваемые гарантии товарного состояния и пригодности
для определённой цели. Подробности в тексте лицензии.

Коротко: приложением можно пользоваться где угодно, в том числе в компаниях.
Изменённые версии и форки, которые распространяются или работают как сетевой
сервис, должны быть открыты под той же лицензией. Документы, созданные в
Docpoint, лицензия не затрагивает.
