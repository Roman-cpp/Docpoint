# Стандарт составных UI-компонентов (compound components)

Область действия: переиспользуемые UI-компоненты без бизнес-логики — модалки, меню, поповеры, аккордеоны, табы, тултипы, карточки со слотами.

Стандарт описывает паттерн **compound component в стиле Radix-примитивов**: один экспорт-неймспейс, набор плоских частей, неявная связь через React Context. Документ самодостаточен — реализовать компонент по нему можно в любом React-проекте, независимо от архитектуры слоёв, сборщика и системы стилей.

---

## 1. Когда применять

Применять, если верно **хотя бы два** пункта:

- компонент состоит из нескольких визуально и семантически разных зон (шапка, тело, футер; триггер и содержимое);
- часть зон **опциональна** — компонент валиден и без них;
- потребителю нужно класть в зоны произвольный контент, а не строку;
- зонам нужен общий доступ к одному кусочку состояния (закрыть, выбрать, переключить).

Не применять, если компонент — один узел с конечным набором пропов (`Button`, `Input`, `Badge`, `Spinner`). Для них обычный компонент с пропами проще и честнее.

**Признак ошибочного выбора:** пропы вида `title`, `subtitle`, `footerLeft`, `footerRight`, `renderHeader`, `headerActions` — это compound component, вывернутый наизнанку. Каждый новый слот там требует нового пропа; в составном компоненте — не требует ничего.

---

## 2. Термины

**Часть (part)** — одна зона составного компонента: `Root`, `Header`, `Body`, `Item`. Реализуется локальной функцией модуля, наружу отдельно **не экспортируется**.

**Неймспейс** — объект, собирающий все части и являющийся единственным экспортом модуля.

**Контекст-гард** — хук, читающий контекст и бросающий ошибку, если часть использована вне своего `Root`.

**Controlled-компонент** — компонент, не хранящий состояние открытия/выбора: получает его пропом и сообщает о намерении изменить через колбэк.

**Плоские дети** — части, лежащие в JSX прямыми соседями (`Title`, `Subtitle`, `Close` внутри `Header`), а не завёрнутые в служебные обёртки ради раскладки.

---

## 3. Файловая структура

Один компонент — одна папка, все файлы ко-локованы:

```
Sheet/
├── Sheet.tsx           # все части + неймспейс
├── Sheet.module.css    # все стили частей
└── index.ts            # public API: export { Sheet } from "./Sheet";
```

Правила:

1. **Все части — в одном файле.** Дробить `Header.tsx`, `Body.tsx`, `Footer.tsx` запрещено: части связаны общим контекстом и общим CSS-модулем, разнесение по файлам ломает связность и плодит циклические импорты.
2. Файл части не превышает разумного объёма (~250 строк). Если превышает — компонент делает слишком много, выделяйте вложенный примитив с собственным неймспейсом.
3. Один CSS-модуль на компонент. Классы частей живут рядом и видят общие переменные.
4. Именование файлов — PascalCase, по имени неймспейса. Папка называется так же.

---

## 4. Публичный API — объект-неймспейс

Единственный экспорт модуля — константа-объект:

```typescript
export const Sheet = {
  Root,
  Header,
  Title,
  Body,
  Footer,
  Close,
};
```

Правила:

1. Части объявляются как локальные `function`-декларации и **не экспортируются поимённо**. Единственная точка входа — неймспейс.
2. Никаких `default export`.
3. **Не** использовать присваивание свойств функции (`Root.Header = Header`). Такой вариант допускает `<Sheet>` без `.Root`, ломает вывод типов у мемоизированных компонентов и путает React DevTools. Обычный объект однозначен.
4. Порядок ключей в объекте повторяет порядок частей в разметке сверху вниз — объект работает как оглавление компонента.
5. Имя неймспейса — существительное в единственном числе, PascalCase.

Потребитель пишет:

```tsx
<Sheet.Root open={open} onOpenChange={setOpen}>
  <Sheet.Header>
    <Sheet.Title>Заголовок</Sheet.Title>
    <Sheet.Close />
  </Sheet.Header>
  <Sheet.Body>{children}</Sheet.Body>
</Sheet.Root>
```

---

## 5. Контекст и контекст-гард

`Root` создаёт провайдер, части читают его через хук-гард.

```typescript
interface SheetContextValue {
  close: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetCtx(part: string): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) {
    throw new Error(`<Sheet.${part}> должен использоваться внутри <Sheet.Root>`);
  }
  return ctx;
}
```

Правила:

1. **Дефолт контекста — `null`**, а не объект-заглушка. Заглушка превращает ошибку композиции в молчаливое ничегонеделание.
2. Гард принимает имя части и подставляет его в сообщение. Ошибка должна называть конкретный тег, а не «context is missing».
3. **Гард вызывают все части, даже те, которым значение не нужно.** Для `Header` или `Body` вызов `useSheetCtx("Header")` — это проверка композиции, а не чтение данных. Стоимость нулевая, польза — падение на этапе разработки вместо визуального бага.
4. В контекст кладут **минимум**: колбэки и идентификаторы, но не весь стейт и не пропы `Root`. Разрастающийся контекст — сигнал, что часть логики пора поднять к потребителю.
5. Значение контекста стабилизируют (`useMemo`/`useCallback`), если оно содержит больше одного поля или `Root` рендерится часто.

---

## 6. `Root` — контракт

```typescript
interface RootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ширина в px; по умолчанию 392 */
  width?: number;
  children: ReactNode;
  className?: string;
}

function Root({ open, onOpenChange, width, children, className }: RootProps) {
  if (!open) return null;

  const close = () => onOpenChange(false);
  const style = width ? ({ "--sheet-width": `${width}px` } as CSSProperties) : undefined;

  return (
    <SheetContext.Provider value={{ close }}>
      <div className={s.overlay} onClick={close}>
        <div
          className={cx(s.box, className)}
          style={style}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </SheetContext.Provider>
  );
}
```

Правила:

1. **Компонент строго controlled.** Пара `open` / `onOpenChange(next: boolean)` — обязательная сигнатура для всего, что открывается и закрывается. Внутреннего `useState` для открытия быть не должно: иначе состояние раздваивается, а потребитель не может закрыть компонент программно.
2. Колбэк называется `onOpenChange` и принимает **следующее** состояние, а не `onClose` без аргументов. Одна сигнатура покрывает открытие, закрытие и переключение и напрямую совместима с сеттером `useState`.
3. Для выбора вместо открытия — та же схема: `value` / `onValueChange`.
4. `if (!open) return null` **до** любых хуков — либо после всех, если хуки нужны. Ранний выход между хуками нарушает правила хуков.
5. Закрытый компонент размонтируется. Если нужна анимация выхода — это осознанное расширение (раздел 12), а не поведение по умолчанию.
6. `Root` **не решает за потребителя**, можно ли закрыться. Блокировка на время загрузки — забота вызывающего кода:

```tsx
const handleOpenChange = (next: boolean) => {
  if (isSaving) return;      // блокируем закрытие во время сохранения
  if (!next) resetForm();
  onOpenChange(next);
};
```

---

## 7. Части и раскладка

Части — тонкие обёртки над DOM-узлом: класс из модуля, `children`, `className`. Никакой логики.

```typescript
interface PartProps {
  children?: ReactNode;
  className?: string;
}

/** Шапка — grid `1fr auto`: слева Title/Subtitle, справа Close */
function Header({ children, className }: PartProps) {
  useSheetCtx("Header");
  return <div className={cx(s.header, className)}>{children}</div>;
}
```

Правила:

1. **Дети остаются плоскими, раскладку берёт на себя CSS Grid.** Контейнер задаёт сетку, дочерние части сами объявляют свои `grid-column` / `grid-row`. Служебные обёртки (`.headerText`, `.titleGroup`) ради выравнивания запрещены — они добавляют узел в DOM и уровень в JSX, ничего не давая потребителю.

```css
.header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  column-gap: 12px;
  row-gap: 4px;
}

.title    { grid-column: 1; grid-row: 1; min-width: 0; }
.subtitle { grid-column: 1; grid-row: 2; min-width: 0; }
.closeBtn { grid-column: 2; grid-row: 1 / -1; align-self: start; }
```

2. **Каждая часть опциональна.** Сетка обязана корректно схлопываться, если `Subtitle` или `Close` не передали.
3. Части не знают о существовании друг друга и не проверяют порядок. Порядок — забота потребителя; сетка делает его устойчивым к перестановкам.
4. `min-width: 0` на текстовых частях внутри grid — обязателен, иначе длинная строка распирает колонку.
5. Каждая часть снабжается однострочным doc-комментарием, описывающим её место в раскладке. Это единственная документация, которую потребитель увидит в подсказке IDE.

---

## 8. Escape hatch: `className`

Каждая часть принимает `className` и **дописывает** его к собственному классу:

```typescript
const cx = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(" ");
```

Правила:

1. Внешний класс идёт **после** модульного — так каскад позволяет его переопределить при равной специфичности.
2. Модульный класс не заменяется никогда. `className` расширяет базу, а не отменяет её.
3. Свои пропы-модификаторы (`size`, `tone`, `variant`) вводят только тогда, когда вариант становится частью дизайн-системы. Одноразовая правка отступа — задача `className`, а не нового пропа.

---

## 9. Параметризация через CSS-переменные

Числовые размеры пробрасываются CSS-переменной, а не классом-модификатором и не inline-свойством:

```typescript
const style = width ? ({ "--sheet-width": `${width}px` } as CSSProperties) : undefined;
```

```css
.box { width: var(--sheet-width, 392px); }
```

Правила:

1. Дефолт живёт в CSS (`var(--x, 392px)`), а не в дефолтном значении пропа. Одно место истины, значение видно тому, кто читает стили.
2. Проп передаётся только если задан — иначе `style` остаётся `undefined` и переменная не попадает в DOM.
3. Так параметризуют непрерывные величины (ширина, максимальная высота, смещение). Дискретные состояния (`variant="danger"`) — это классы.
4. Все цвета, радиусы, тени, шрифты, длительности переходов берутся **только** из токенов дизайн-системы:

```css
.box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-2xl);
  box-shadow: var(--shadow-xl);
}
```

Литеральные `#fff`, `8px` для радиуса, `0.2s` для перехода в компоненте не допускаются: они выпадают из темизации. Исключение — геометрия раскладки (`padding`, `gap`, `grid-template`), у которой токена нет.

---

## 10. Семантические слоты вместо внешних компонентов

Если у компонента есть фиксированный набор действий (кнопки футера, пункты меню), они объявляются частями неймспейса:

```typescript
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

function BtnPrimary({ className, ...rest }: BtnProps) {
  return <button type="button" className={cx(s.btnBase, s.btnPrimary, className)} {...rest} />;
}
```

Правила:

1. Слот расширяет нативный элемент (`ButtonHTMLAttributes`) и разливает `...rest` — `disabled`, `autoFocus`, `onClick`, `aria-*`, `form` работают без объявления.
2. `type="button"` ставится явно и **до** `...rest`, чтобы кнопка не сабмитила форму, но потребитель мог перекрыть тип осознанно.
3. `className` деструктурируется отдельно от `...rest` — иначе он затрёт модульные классы.
4. Слот не заменяет общий `Button` дизайн-системы в остальном приложении. Он замыкает визуальный контракт **этого** компонента: футер модалки должен выглядеть одинаково во всех модалках, а не наследовать вариант, выбранный на месте вызова.
5. Иконки, нужные только этому компоненту (крестик, шеврон), объявляются локальными функциями в том же файле. Внешняя иконочная зависимость ради одного глифа не подключается.

---

## 11. Типизация

1. Пропы каждой части — отдельный `interface`. Общий `PartProps` переиспользуется частями с одинаковым контрактом.
2. Публичные пропы документируются JSDoc с указанием единиц и дефолта: `/** Ширина в px, по умолчанию 392 */`.
3. `children` типизируется `ReactNode`. `ReactElement` или ограничения на тип детей — запрещены: они ломают `{condition && <Part/>}`, массивы и фрагменты.
4. Кастомные CSS-переменные требуют приведения `as CSSProperties` — это ожидаемо, шире тип не расширяем.
5. Интерфейсы пропов не экспортируются, если потребителю не нужно строить обёртки. Экспорт типа — такое же публичное обязательство, как экспорт кода.

---

## 12. Что стандарт не покрывает

Базовый паттерн описывает **композицию и стилизацию**. Поведение полноценного оверлейного примитива в него не входит и добавляется осознанно, по мере необходимости:

| Возможность | Зачем | Как добавляют |
| --- | --- | --- |
| Portal | Вырваться из `overflow: hidden` и стека `z-index` родителя | `createPortal(tree, document.body)` в `Root` |
| Закрытие по `Escape` | Ожидаемое поведение оверлея | `useEffect` с `keydown` на `document`, снятие при размонтировании |
| Focus trap и возврат фокуса | Клавиатурная навигация не должна уходить под оверлей | Сохранить `document.activeElement`, зациклить Tab, вернуть фокус при закрытии |
| `role="dialog"` / `aria-modal` / `aria-labelledby` | Скринридер должен объявить оверлей и его заголовок | Атрибуты на боксе, генерируемый `id` у `Title` через `useId` |
| Блокировка скролла body | Фон не должен прокручиваться под оверлеем | `overflow: hidden` на `body` на время открытия |
| Клик по подложке с клавиатуры | `div` с `onClick` недостижим с клавиатуры | Закрытие по `Escape` как основной путь + `aria-hidden` на подложке |

Если этот список нужен целиком — берите готовый headless-примитив (Radix, Ark, React Aria) и оборачивайте его в тот же неймспейс: стандарт композиции из разделов 4–10 остаётся в силе, меняется только начинка `Root`.

**Явно зафиксируйте выбор в шапке файла.** Компонент, написанный с нуля, обязан нести комментарий о том, какие гарантии не реализованы — иначе следующий разработчик будет считать их работающими.

---

## 13. Антипаттерны

| Антипаттерн | Чем плох | Как правильно |
| --- | --- | --- |
| `title` / `subtitle` / `footer` пропами | Каждый слот — новый проп, контент ограничен строкой | Части `Title`, `Subtitle`, `Footer` |
| `renderHeader={() => ...}` | Render-prop там, где хватает `children` | Часть `Header` |
| Проброс `onClose` в каждую часть | Ручная передача того, что уже есть в контексте | `useCtx` внутри части |
| Внутренний `useState(open)` | Раздвоение состояния, невозможно закрыть снаружи | `open` / `onOpenChange` |
| Дефолт контекста — объект-заглушка | Ошибка композиции не проявляется | Дефолт `null` + гард |
| Обёртка `.headerText` ради выравнивания | Лишний узел в DOM и уровень в JSX | Плоские дети + grid-области |
| `Root.Header = Header` | Допускает `<Sheet>` без `.Root`, ломает типы и DevTools | Объект-неймспейс |
| Экспорт частей поимённо | Часть можно вырвать из контекста | Экспорт только неймспейса |
| Литеральные цвета и радиусы | Компонент выпадает из темизации | Токены дизайн-системы |
| `className` внутри `...rest` | Внешний класс затирает модульный | Деструктурировать и конкатенировать |

---

## 14. Чек-лист

Композиция:

- [ ] Единственный экспорт — объект-неймспейс; части наружу не торчат
- [ ] Порядок ключей неймспейса повторяет порядок в разметке
- [ ] Все части в одном файле, рядом с одним CSS-модулем
- [ ] Компонент валиден при отсутствии любой опциональной части

Контекст:

- [ ] Дефолт контекста — `null`
- [ ] Гард принимает имя части и называет её в сообщении об ошибке
- [ ] Гард вызывают все части, включая те, которым значение не нужно
- [ ] В контексте — минимум полей; значение стабилизировано

Состояние:

- [ ] `open` / `onOpenChange(next)` — никакого внутреннего стейта открытия
- [ ] Ранний `return null` не разрывает цепочку хуков
- [ ] Решение «можно ли закрыться» принимает потребитель, не компонент

Стили:

- [ ] Раскладка на grid, дети плоские, обёрток ради выравнивания нет
- [ ] `min-width: 0` на текстовых частях в grid
- [ ] Числовые размеры — через CSS-переменную, дефолт в CSS
- [ ] Цвета, радиусы, тени, шрифты, переходы — только токены
- [ ] Каждая часть принимает `className` и дописывает его после модульного

Типы и документация:

- [ ] Публичные пропы с JSDoc, единицами и дефолтами
- [ ] `children: ReactNode`, без сужения
- [ ] Doc-комментарий у каждой части — её место в раскладке
- [ ] Нереализованные гарантии (portal, Escape, focus trap, ARIA) перечислены в шапке файла

Витрина:

- [ ] История «минимум», история «максимум», история с крайними случаями

---

## Приложение. Референс-шаблон

Минимальный компонент, удовлетворяющий стандарту целиком. Замените `Sheet` на имя своего компонента, набор частей — на свой, имена токенов — на принятые в вашей дизайн-системе.

### `Sheet.tsx`

```tsx
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import s from "./Sheet.module.css";

/*
 * Составной компонент в стиле Radix-примитивов.
 * НЕ реализовано осознанно: portal, закрытие по Escape, focus trap,
 * ARIA-атрибуты, блокировка скролла body. См. раздел 12 стандарта.
 */

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface SheetContextValue {
  close: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetCtx(part: string): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) {
    throw new Error(`<Sheet.${part}> должен использоваться внутри <Sheet.Root>`);
  }
  return ctx;
}

const cx = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ */
/* Части                                                               */
/* ------------------------------------------------------------------ */

interface RootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ширина бокса в px, по умолчанию 392 */
  width?: number;
  children: ReactNode;
  className?: string;
}

function Root({ open, onOpenChange, width, children, className }: RootProps) {
  const ctx = useMemo<SheetContextValue>(
    () => ({ close: () => onOpenChange(false) }),
    [onOpenChange],
  );

  if (!open) return null;

  const boxStyle = width ? ({ "--sheet-width": `${width}px` } as CSSProperties) : undefined;

  return (
    <SheetContext.Provider value={ctx}>
      <div className={s.overlay} onClick={ctx.close}>
        <div
          className={cx(s.box, className)}
          style={boxStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </SheetContext.Provider>
  );
}

interface PartProps {
  children?: ReactNode;
  className?: string;
}

/** Шапка — grid `1fr auto`: слева Title/Subtitle, справа Close */
function Header({ children, className }: PartProps) {
  useSheetCtx("Header");
  return <div className={cx(s.header, className)}>{children}</div>;
}

/** Заголовок — левая колонка, первая строка */
function Title({ children, className }: PartProps) {
  useSheetCtx("Title");
  return <span className={cx(s.title, className)}>{children}</span>;
}

/** Подзаголовок — левая колонка, вторая строка */
function Subtitle({ children, className }: PartProps) {
  useSheetCtx("Subtitle");
  return <span className={cx(s.subtitle, className)}>{children}</span>;
}

/** Кнопка закрытия — правая колонка, закрывает через контекст */
function Close({ className }: { className?: string }) {
  const { close } = useSheetCtx("Close");
  return (
    <button
      type="button"
      className={cx(s.closeBtn, className)}
      onClick={close}
      aria-label="Закрыть"
    >
      <CloseIcon />
    </button>
  );
}

/** Тело — основной контент */
function Body({ children, className }: PartProps) {
  useSheetCtx("Body");
  return <div className={cx(s.body, className)}>{children}</div>;
}

/** Футер — полоса действий с разделителем сверху */
function Footer({ children, className }: PartProps) {
  useSheetCtx("Footer");
  return <div className={cx(s.footer, className)}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Слоты действий                                                      */
/* ------------------------------------------------------------------ */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

function BtnPrimary({ className, ...rest }: BtnProps) {
  return <button type="button" className={cx(s.btnBase, s.btnPrimary, className)} {...rest} />;
}

function BtnCancel({ className, ...rest }: BtnProps) {
  return <button type="button" className={cx(s.btnBase, s.btnCancel, className)} {...rest} />;
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 11 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      width="11"
      height="11"
    >
      <title>close</title>
      <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Публичный API                                                       */
/* ------------------------------------------------------------------ */

export const Sheet = {
  Root,
  Header,
  Title,
  Subtitle,
  Close,
  Body,
  Footer,
  BtnPrimary,
  BtnCancel,
};
```

### `Sheet.module.css`

```css
.overlay {
  position: fixed;
  inset: 0;
  background: var(--backdrop);
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
}

.box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-2xl);
  box-shadow: var(--shadow-xl);
  width: var(--sheet-width, 392px);
  overflow: hidden;
}

/* ─── Header ──────────────────────────────────────────────── */
/* Плоские дети раскладываются по grid-областям без обёрток.   */
.header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  column-gap: 12px;
  row-gap: 4px;
  padding: 20px 22px 18px;
  border-bottom: 1px solid var(--border);
}

.title    { grid-column: 1; grid-row: 1;      min-width: 0; }
.subtitle { grid-column: 1; grid-row: 2;      min-width: 0; }
.closeBtn { grid-column: 2; grid-row: 1 / -1; align-self: start; }

/* ─── Body / Footer ───────────────────────────────────────── */
.body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 18px 18px;
  border-top: 1px solid var(--border);
}

/* ─── Слоты действий ──────────────────────────────────────── */
.btnBase {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  line-height: 1;
  border-radius: var(--r-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--t-base), border-color var(--t-base), color var(--t-base);
}

.btnBase:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
```

### `index.ts`

```typescript
export { Sheet } from "./Sheet";
```

### Использование

```tsx
const [open, setOpen] = useState(false);

const handleOpenChange = (next: boolean) => {
  if (isSaving) return;
  if (!next) reset();
  setOpen(next);
};

<Sheet.Root open={open} onOpenChange={handleOpenChange}>
  <Sheet.Header>
    <Sheet.Title>Новый документ</Sheet.Title>
    <Sheet.Subtitle>Короткое пояснение</Sheet.Subtitle>
    <Sheet.Close />
  </Sheet.Header>
  <Sheet.Body>{/* поля формы */}</Sheet.Body>
  <Sheet.Footer>
    <Sheet.BtnCancel onClick={() => handleOpenChange(false)}>Отмена</Sheet.BtnCancel>
    <Sheet.BtnPrimary onClick={submit} disabled={!canSubmit} autoFocus>
      Создать
    </Sheet.BtnPrimary>
  </Sheet.Footer>
</Sheet.Root>
```
