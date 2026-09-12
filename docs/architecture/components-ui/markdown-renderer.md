# Рендеринг Markdown

Область действия: отображение markdown-документа из строки — предпросмотр файлов, README, описания сущностей, чат-сообщения.

Документ описывает связку **react-markdown + remark-gfm + Shiki** с подсветкой кода, следующей за системной темой, и ленивой загрузкой всего графа зависимостей. Документ самодостаточен — собрать просмотрщик по нему можно в любом React-проекте: он получает на вход только `content: string`, источник строки ему безразличен.

Реализация в этом проекте: `src/shared/ui-kit/data-display/Markdown/`.

---

## 1. Состав

| Пакет | Роль | Обязателен |
| ------------------- | ---------------------------------------------------------------- | -------------------- |
| `react-markdown` | Парсит md → строит React-дерево. Без `dangerouslySetInnerHTML` | да |
| `remark-gfm` | GFM: таблицы, `~~зачёркивание~~`, task-list, автоссылки | без него нет таблиц |
| `shiki` | Подсветка кода: движок, грамматики, темы | нет |
| `@shikijs/rehype` | Мост Shiki → rehype-плагин для react-markdown | только вместе с shiki |
| `react` ≥ 19 | Нужен для `use(promise)` — см. §7 | заменим |

```bash
npm i react-markdown remark-gfm shiki @shikijs/rehype
```

Минимальный рабочий вариант — один `react-markdown`. Остальное наращивается независимо и по отдельности.

---

## 2. Файловая структура

```
Markdown/
├── Markdown.tsx           # компонент
├── Markdown.module.css    # типографика + переключение темы подсветки
├── lib/
│   └── highlighter.ts     # синглтон Shiki
└── index.ts               # public API: export { Markdown } from "./Markdown";
```

`highlighter.ts` вынесен в `lib/`, а не лежит рядом с компонентом: это не UI, а разделяемый между всеми рендерами ресурс с собственным жизненным циклом.

---

## 3. Синглтон Shiki

Ключевой файл для веса бандла. **Fine-grained сборка**: `shiki/core` плюс явные импорты тем и грамматик вместо олл-ин-ван пакета `shiki`, который тянет сотни грамматик и десятки тем.

```ts
// lib/highlighter.ts
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
	highlighterPromise ??= createHighlighterCore({
		themes: [
			import("@shikijs/themes/github-light"),
			import("@shikijs/themes/github-dark"),
		],
		langs: [
			import("@shikijs/langs/typescript"),
			import("@shikijs/langs/tsx"),
			import("@shikijs/langs/css"),
		],
		engine: createJavaScriptRegexEngine({ forgiving: true }),
	});

	return highlighterPromise;
}
```

Три решения, каждое влияет либо на размер бандла, либо на падения:

1. **`createJavaScriptRegexEngine` вместо Oniguruma** — убирает WASM-блоб (~500 КБ) и его загрузку. Расплата: JS-движок не понимает часть Oniguruma-паттернов, поэтому `forgiving: true` обязателен — иначе такая грамматика даёт исключение вместо просто менее точной подсветки.
2. **Синглтон через `??=`** — не оптимизация, а требование. Создание хайлайтера дорогое, а `use()` не принимает новый промис на каждый рендер (§7).
3. **Список `langs` — это и есть цена сборки.** Добавить язык = добавить `import("@shikijs/langs/python")`. Неперечисленный язык отрендерится как plain text.

---

## 4. Компонент

```tsx
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { use, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getHighlighter } from "./lib/highlighter";
import s from "./Markdown.module.css";

type RehypePlugins = React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"];

const REMARK_PLUGINS = [remarkGfm];

const SHIKI_OPTIONS = {
	themes: { light: "github-light", dark: "github-dark" },
	defaultColor: false,
	defaultLanguage: "text",
	fallbackLanguage: "text",
} as const;

const EXTERNAL_HREF = /^(https?:|mailto:)/i;

const COMPONENTS: Components = {
	a({ node, href, children, ...rest }) {
		if (href && EXTERNAL_HREF.test(href)) {
			return (
				<a {...rest} href={href} target="_blank" rel="noopener noreferrer">
					{children}
				</a>
			);
		}

		return <span className={s.deadLink}>{children}</span>;
	},
	table({ node, children, ...rest }) {
		return (
			<div className={s.tableWrap}>
				<table {...rest}>{children}</table>
			</div>
		);
	},
};

interface Props {
	content: string;
}

export function Markdown({ content }: Props) {
	const highlighter = use(getHighlighter());

	const rehypePlugins = useMemo<RehypePlugins>(
		() => [[rehypeShikiFromHighlighter, highlighter, SHIKI_OPTIONS]],
		[highlighter],
	);

	return (
		<div className={s.prose}>
			<ReactMarkdown
				remarkPlugins={REMARK_PLUGINS}
				rehypePlugins={rehypePlugins}
				components={COMPONENTS}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
```

**`REMARK_PLUGINS` и `SHIKI_OPTIONS` объявлены вне компонента** — не косметика: новый массив на каждом рендере заставляет react-markdown перепарсивать документ целиком.

### Точка кастомизации — `components`

Здесь переопределены два узла:

- **`a`** — внешние ссылки (`http(s):`, `mailto:`) открываются в новой вкладке с `rel="noopener noreferrer"`; остальные превращаются в неинтерактивный `span`, потому что относительной ссылке внутри файлошары некуда вести. **В проекте с реальным роутингом это место заменяется на `<Link>`.**
- **`table`** — обёртка со скроллом, чтобы широкая таблица не растягивала контейнер.

---

## 5. Темизация подсветки

`defaultColor: false` меняет вывод Shiki: вместо `color: #24292e` в inline-стили пишутся только переменные `--shiki-light` / `--shiki-dark`. Тему выбирает CSS — переключение идёт **без ре-рендера и без повторного прохода подсветки**.

```css
/* CSS Modules требует :global — класс .shiki проставляет Shiki, а не мы */
.prose :global(.shiki),
.prose :global(.shiki) span {
	color: var(--shiki-light);
	background-color: var(--shiki-light-bg);
}

@media (prefers-color-scheme: dark) {
	.prose :global(.shiki),
	.prose :global(.shiki) span {
		color: var(--shiki-dark);
		background-color: var(--shiki-dark-bg);
	}
}
```

Если тема переключается атрибутом (`[data-theme="dark"]`), а не медиа-запросом — меняется только селектор, механизм тот же.

### Обязательное правило типографики

Остальной CSS — обычная типографика на токенах проекта, но одна пара правил неочевидна:

```css
.prose code {
	background: var(--surface2);
	border: 1px solid var(--border);
	padding: 1px 4px;
}

.prose pre code {
	background: none;
	border: none;
	padding: 0;
}
```

react-markdown отдаёт `<code>` и для инлайнового кода, и внутри блока `<pre>`. Без сброса во втором правиле рамка и фон нарисуются дважды.

---

## 6. Ленивая загрузка

Граф из §1 тяжёлый и нужен только когда markdown реально показывают. Подключение через `lazy` + `Suspense`:

```tsx
const MarkdownPreviewContent = lazy(() =>
	import("../MarkdownPreviewContent").then((module) => ({
		default: module.MarkdownPreviewContent,
	})),
);

<Suspense key={file.token} fallback={<div>Загрузка…</div>}>
	<MarkdownPreviewContent token={file.token} />
</Suspense>;
```

**`key` на `Suspense`** — при смене документа содержимое перемонтируется, и прокрутка сама уезжает в начало; отдельный эффект для сброса скролла не нужен.

### Vite: обязательный `optimizeDeps.include`

Раз зависимости грузятся лениво, Vite обнаружит их только в момент первого открытия — и тут же запустит переоптимизацию с полной перезагрузкой страницы по HMR. Лечится явным перечислением в `vite.config.ts`:

```ts
optimizeDeps: {
	include: [
		"react-markdown",
		"remark-gfm",
		"@shikijs/rehype/core",
		"shiki/core",
		"shiki/engine/javascript",
		"@shikijs/themes/github-light",
		"@shikijs/themes/github-dark",
		"@shikijs/langs/typescript",
		"@shikijs/langs/tsx",
		"@shikijs/langs/css",
	],
},
```

Список держать синхронным с `highlighter.ts`: добавил язык туда — добавь и сюда.

---

## 7. Ограничения и грабли

**`use()` требует React 19 и стабильный промис.** Если `getHighlighter()` начнёт создавать новый промис на каждый вызов — бесконечное подвешивание. Отсюда синглтон в §3. Замена для React 18:

```tsx
const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

useEffect(() => {
	getHighlighter().then(setHighlighter);
}, []);

if (!highlighter) return null; // либо рендер без rehypePlugins
```

**`use()` подвешивает компонент** — `Suspense` выше по дереву обязателен. В этом проекте его роль играет тот же boundary, что и у `lazy`.

**`fallbackLanguage` не опционален.** Shiki бросает исключение на ` ```python `, если грамматика не загружена. Без фолбэка одна такая ограда роняет весь просмотрщик.

**Сырой HTML в markdown не рендерится.** react-markdown экранирует его по умолчанию, а URL прогоняет через `urlTransform`, который режет `javascript:` и подобное. Это и есть защита от XSS в пользовательском контенте. Если HTML всё же нужен — `rehype-raw` подключается **только в паре с `rehype-sanitize`**, иначе получается дыра.

---

## 8. Что не относится к рендереру

При переносе в другой проект остаётся снаружи:

- **загрузка содержимого** — в файлошаре это чтение первых 256 КБ по HTTP `Range` (`fetchFileshareTextApi`) и кеш TanStack Query по токену;
- **предупреждение об усечении** — `Notice` над документом, свойство конкретного источника, а не разметки;
- **CSS-переменные дизайн-системы** — `--font`, `--mono`, `--text`, `--border`, `--surface2`, `--accent`.

Сам `Markdown` знает только про строку.
