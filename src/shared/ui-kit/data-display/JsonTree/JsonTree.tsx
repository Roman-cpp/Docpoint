import {
	type CSSProperties,
	forwardRef,
	memo,
	useCallback,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import s from "./JsonTree.module.css";

export type Json =
	| null
	| boolean
	| number
	| string
	| Json[]
	| { [key: string]: Json };

/* ── Настройки ────────────────────────────────────────────────────── */

/** Отступ на уровень вложенности, px */
const INDENT = 16;
/** Сколько строк дорисовывать сверху и снизу от вьюпорта */
const OVERSCAN = 12;
/** Сколько детей показывать у одного узла до нажатия «показать ещё» */
const CHUNK = 200;
/**
 * Предохранитель: сколько строк максимум попадёт в плоский список.
 * Упереться можно только «развернуть всё» на огромном JSON — тогда хвост
 * не строится, а внизу появляется явное предупреждение.
 *
 * Лимит мягкий: закрывающие скобки дописываются уже после возврата из
 * рекурсии, поэтому итог может превысить его на глубину дерева (единицы
 * строк). Так скобки остаются сбалансированными у того, что показано.
 */
const MAX_ROWS = 100_000;

const SIZES = {
	sm: { fontSize: 11.5, rowH: 20 },
	md: { fontSize: 12.5, rowH: 22 },
} as const;

/* ── Модель строк ─────────────────────────────────────────────────── */

type RowKind = "leaf" | "empty" | "branch" | "close" | "more" | "limit";

interface Row {
	/** Стабильный путь до узла — он же React-key и ключ состояния раскрытия */
	path: string;
	kind: RowKind;
	depth: number;
	/** Ключ объекта или индекс массива; отсутствует у корня */
	label?: string;
	/** true, если label — индекс массива (другой цвет) */
	isIndex?: boolean;
	value?: unknown;
	isArray?: boolean;
	open?: boolean;
	/** Число детей у ветки / число скрытых детей у строки «показать ещё» */
	count?: number;
	/** Запятая после значения (не у последнего элемента) */
	comma?: boolean;
}

/** Разделитель в путях — управляющий символ, чтобы не столкнуться с ключами */
const SEP = "\u0001";

const isExpandable = (v: unknown): v is object =>
	v !== null && typeof v === "object";

const childCount = (v: object): number =>
	Array.isArray(v) ? v.length : Object.keys(v).length;

interface FlattenOpts {
	isOpen: (path: string, depth: number) => boolean;
	limitOf: (path: string) => number;
	showArrayIndex: boolean;
}

/**
 * Разворачивает JSON в плоский список ВИДИМЫХ строк. В обход попадают только
 * раскрытые узлы — стоимость зависит от того, что показано, а не от размера
 * документа.
 */
function flatten(root: unknown, opts: FlattenOpts): Row[] {
	const rows: Row[] = [];
	let hitLimit = false;

	const walk = (
		value: unknown,
		path: string,
		depth: number,
		label: string | undefined,
		isIndex: boolean,
		comma: boolean,
	) => {
		if (rows.length >= MAX_ROWS) {
			hitLimit = true;
			return;
		}

		if (!isExpandable(value)) {
			rows.push({ kind: "leaf", path, depth, label, isIndex, value, comma });
			return;
		}

		const isArray = Array.isArray(value);
		// Считаем детей без материализации пар — у закрытого узла нужен только size
		const total = childCount(value);

		if (total === 0) {
			rows.push({ kind: "empty", path, depth, label, isIndex, isArray, comma });
			return;
		}

		const open = opts.isOpen(path, depth);
		rows.push({
			kind: "branch",
			path,
			depth,
			label,
			isIndex,
			isArray,
			open,
			count: total,
			comma,
		});
		if (!open) return;

		const limit = Math.min(total, opts.limitOf(path));

		if (isArray) {
			const arr = value as unknown[];
			for (let i = 0; i < limit; i++) {
				walk(
					arr[i],
					`${path}${SEP}${i}`,
					depth + 1,
					opts.showArrayIndex ? String(i) : undefined,
					true,
					i < total - 1,
				);
			}
		} else {
			const keys = Object.keys(value);
			for (let i = 0; i < limit; i++) {
				const k = keys[i];
				walk(
					(value as Record<string, unknown>)[k],
					`${path}${SEP}${k}`,
					depth + 1,
					k,
					false,
					i < total - 1,
				);
			}
		}

		if (limit < total) {
			rows.push({
				kind: "more",
				path: `${path}${SEP}more`,
				depth: depth + 1,
				count: total - limit,
				// путь родителя нужен, чтобы поднять лимит именно ему
				label: path,
			});
		}

		rows.push({
			kind: "close",
			path: `${path}${SEP}close`,
			depth,
			isArray,
			comma,
		});
	};

	walk(root, "$", 0, undefined, false, false);

	if (hitLimit) {
		rows.push({ kind: "limit", path: `${SEP}limit`, depth: 0 });
	}
	return rows;
}

/* ── Примитивы ────────────────────────────────────────────────────── */

const Leaf = memo(function Leaf({
	value,
	maxStringLength,
}: {
	value: unknown;
	maxStringLength: number;
}) {
	if (value === null) return <span className={s.vNull}>null</span>;

	switch (typeof value) {
		case "string": {
			if (value.length <= maxStringLength)
				return <span className={s.vString}>{JSON.stringify(value)}</span>;
			// Режем ДО stringify, иначе на мегабайтной строке аллоцируем её копию
			const head = JSON.stringify(value.slice(0, maxStringLength));
			return (
				<>
					<span className={s.vString} title={value.slice(0, 2000)}>
						{`${head.slice(0, -1)}…"`}
					</span>
					<span className={s.trunc}>
						ещё {value.length - maxStringLength} симв.
					</span>
				</>
			);
		}
		case "number":
			return <span className={s.vNumber}>{String(value)}</span>;
		case "boolean":
			return <span className={s.vBool}>{String(value)}</span>;
		default:
			return <span>{String(value)}</span>;
	}
});

const Chevron = ({ open }: { open: boolean }) => (
	<svg
		viewBox="0 0 10 10"
		width="10"
		height="10"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.6"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
		className={open ? s.chevOpen : s.chev}
	>
		<path d="M3 2l3 3-3 3" />
	</svg>
);

const KeyLabel = ({ label, isIndex }: { label: string; isIndex?: boolean }) => (
	<>
		<span className={isIndex ? s.index : s.key}>
			{isIndex ? label : JSON.stringify(label)}
		</span>
		<span className={s.punct}>: </span>
	</>
);

/* ── Строка ───────────────────────────────────────────────────────── */

interface RowProps {
	row: Row;
	maxStringLength: number;
	onToggle: (path: string, depth: number) => void;
	onMore: (path: string) => void;
}

const JsonRow = memo(function JsonRow({
	row,
	maxStringLength,
	onToggle,
	onMore,
}: RowProps) {
	const pad: CSSProperties = { paddingLeft: row.depth * INDENT };
	const openBr = row.isArray ? "[" : "{";
	const closeBr = row.isArray ? "]" : "}";

	switch (row.kind) {
		case "leaf":
			return (
				<div className={s.row} style={pad}>
					<span className={s.gutter} />
					{row.label !== undefined && (
						<KeyLabel label={row.label} isIndex={row.isIndex} />
					)}
					<Leaf value={row.value} maxStringLength={maxStringLength} />
					{row.comma && <span className={s.punct}>,</span>}
				</div>
			);

		case "empty":
			return (
				<div className={s.row} style={pad}>
					<span className={s.gutter} />
					{row.label !== undefined && (
						<KeyLabel label={row.label} isIndex={row.isIndex} />
					)}
					<span className={s.punct}>
						{openBr}
						{closeBr}
					</span>
					{row.comma && <span className={s.punct}>,</span>}
				</div>
			);

		case "branch":
			return (
				<button
					type="button"
					className={`${s.row} ${s.rowBranch}`}
					style={pad}
					onClick={() => onToggle(row.path, row.depth)}
					aria-expanded={row.open}
				>
					<span className={s.toggle}>
						<Chevron open={!!row.open} />
					</span>
					{row.label !== undefined && (
						<KeyLabel label={row.label} isIndex={row.isIndex} />
					)}
					<span className={s.punct}>{openBr}</span>
					{!row.open && (
						<>
							<span className={s.ellipsis}>…</span>
							<span className={s.punct}>{closeBr}</span>
							{row.comma && <span className={s.punct}>,</span>}
						</>
					)}
					<span className={s.count}>
						{row.count} {row.isArray ? "эл." : "кл."}
					</span>
				</button>
			);

		case "close":
			return (
				<div className={s.row} style={pad}>
					<span className={s.gutter} />
					<span className={s.punct}>{closeBr}</span>
					{row.comma && <span className={s.punct}>,</span>}
				</div>
			);

		case "more":
			return (
				<button
					type="button"
					className={`${s.row} ${s.more}`}
					style={pad}
					// label у этой строки — путь родителя
					onClick={() => onMore(row.label as string)}
				>
					<span className={s.gutter} />
					Показать ещё {Math.min(row.count ?? 0, CHUNK)} из {row.count}
				</button>
			);

		case "limit":
			return (
				<div className={`${s.row} ${s.limit}`} style={pad}>
					<span className={s.gutter} />
					Показаны первые {MAX_ROWS.toLocaleString("ru")} строк — сверните узлы,
					чтобы увидеть остальное
				</div>
			);
	}
});

/* ── Компонент ────────────────────────────────────────────────────── */

interface ExpandState {
	/** Узлы глубже этого уровня закрыты, если нет явного override */
	base: number;
	/** Явные раскрытия/сворачивания по путям */
	overrides: Map<string, boolean>;
}

export interface JsonTreeHandle {
	expandAll: () => void;
	collapseAll: () => void;
}

export interface JsonTreeProps {
	data: unknown;
	/** До какого уровня дерево раскрыто изначально. По умолчанию 1 — корень. */
	defaultExpandedDepth?: number;
	/** Размер шрифта и высота строки */
	size?: keyof typeof SIZES;
	/** Показывать индексы элементов массива */
	showArrayIndex?: boolean;
	/** Длина, после которой строковые значения обрезаются */
	maxStringLength?: number;
	className?: string;
}

export const JsonTree = forwardRef<JsonTreeHandle, JsonTreeProps>(
	function JsonTree(
		{
			data,
			defaultExpandedDepth = 1,
			size = "sm",
			showArrayIndex = true,
			maxStringLength = 500,
			className,
		},
		ref,
	) {
		const { fontSize, rowH } = SIZES[size];

		const [expand, setExpand] = useState<ExpandState>(() => ({
			base: defaultExpandedDepth,
			overrides: new Map(),
		}));
		/** path → сколько детей показывать (сверх CHUNK, через «показать ещё») */
		const [limits, setLimits] = useState<Map<string, number>>(() => new Map());

		useImperativeHandle(
			ref,
			() => ({
				expandAll: () =>
					setExpand({ base: Number.POSITIVE_INFINITY, overrides: new Map() }),
				collapseAll: () => setExpand({ base: 0, overrides: new Map() }),
			}),
			[],
		);

		const toggle = useCallback((path: string, depth: number) => {
			setExpand((prev) => {
				const cur = prev.overrides.get(path) ?? depth < prev.base;
				const overrides = new Map(prev.overrides);
				overrides.set(path, !cur);
				return { base: prev.base, overrides };
			});
		}, []);

		const showMore = useCallback((path: string) => {
			setLimits((prev) => {
				const next = new Map(prev);
				next.set(path, (prev.get(path) ?? CHUNK) + CHUNK);
				return next;
			});
		}, []);

		const rows = useMemo(
			() =>
				flatten(data, {
					isOpen: (path, depth) =>
						expand.overrides.get(path) ?? depth < expand.base,
					limitOf: (path) => limits.get(path) ?? CHUNK,
					showArrayIndex,
				}),
			[data, expand, limits, showArrayIndex],
		);

		/* ── Виртуализация ── */

		const scrollerRef = useRef<HTMLDivElement>(null);
		const [scrollTop, setScrollTop] = useState(0);
		const [viewportH, setViewportH] = useState(0);

		useLayoutEffect(() => {
			const el = scrollerRef.current;
			if (!el) return;
			setViewportH(el.clientHeight);
			const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
			ro.observe(el);
			return () => ro.disconnect();
		}, []);

		// После сворачивания узла дерево становится короче, а scrollTop в стейте
		// ещё старый — браузер поправит его событием scroll, но кадром позже.
		// Зажимаем сами, иначе окно уедет за конец списка и мигнёт пустотой.
		const maxScroll = Math.max(0, rows.length * rowH - viewportH);
		const top = Math.min(scrollTop, maxScroll);

		const first = Math.max(0, Math.floor(top / rowH) - OVERSCAN);
		const last = Math.min(
			rows.length,
			Math.ceil((top + viewportH) / rowH) + OVERSCAN,
		);
		const visible = rows.slice(first, last);

		const styleVars = {
			"--json-row-h": `${rowH}px`,
			"--json-font-size": `${fontSize}px`,
		} as CSSProperties;

		return (
			<div
				ref={scrollerRef}
				className={[s.scroller, className].filter(Boolean).join(" ")}
				style={styleVars}
				onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
			>
				<div className={s.spacer} style={{ height: rows.length * rowH }}>
					<div
						className={s.window}
						style={{ transform: `translateY(${first * rowH}px)` }}
					>
						{visible.map((row) => (
							<JsonRow
								key={row.path}
								row={row}
								maxStringLength={maxStringLength}
								onToggle={toggle}
								onMore={showMore}
							/>
						))}
					</div>
				</div>
			</div>
		);
	},
);
