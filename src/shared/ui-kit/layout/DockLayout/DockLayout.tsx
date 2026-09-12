import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useRef,
} from "react";
import s from "./DockLayout.module.css";

/* ------------------------------------------------------------------ */
/* Context — общий для всех частей, как в Radix-примитивах             */
/* ------------------------------------------------------------------ */

const DockLayoutContext = createContext(false);

function useDockGuard(part: string) {
	const inside = useContext(DockLayoutContext);
	if (!inside) {
		throw new Error(
			`<DockLayout.${part}> должен использоваться внутри <DockLayout.Root>`,
		);
	}
}

/* ------------------------------------------------------------------ */
/* Drag-хук — ресайз по одной оси                                      */
/* ------------------------------------------------------------------ */

interface ResizeOpts {
	axis: "x" | "y";
	initial: number;
	min: number;
	max: number;
	/** 1 — грань растёт по ходу курсора, -1 — против */
	sign: 1 | -1;
}

function useResizeHandle(
	ref: React.RefObject<HTMLDivElement | null>,
	opts: ResizeOpts,
) {
	return useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			const horizontal = opts.axis === "x";
			const start = horizontal ? e.clientX : e.clientY;
			const startSize =
				(horizontal ? ref.current?.offsetWidth : ref.current?.offsetHeight) ??
				opts.initial;

			const onMove = (ev: MouseEvent) => {
				const pos = horizontal ? ev.clientX : ev.clientY;
				const size = Math.max(
					opts.min,
					Math.min(opts.max, startSize + opts.sign * (pos - start)),
				);
				if (ref.current) {
					ref.current.style[horizontal ? "width" : "height"] = `${size}px`;
				}
			};
			const onUp = () => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			document.body.style.cursor = horizontal ? "col-resize" : "row-resize";
			document.body.style.userSelect = "none";
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[opts.axis, opts.initial, opts.min, opts.max, opts.sign],
	);
}

/* ------------------------------------------------------------------ */
/* Части                                                               */
/* ------------------------------------------------------------------ */

interface RootProps {
	children: ReactNode;
	className?: string;
}

function Root({ children, className }: RootProps) {
	return (
		<DockLayoutContext.Provider value={true}>
			<div className={`${s.root}${className ? ` ${className}` : ""}`}>
				{children}
			</div>
		</DockLayoutContext.Provider>
	);
}

interface SimpleProps {
	children?: ReactNode;
	className?: string;
}

/** Header — во всю ширину сверху, высота подстраивается под контент */
function Header({ children, className }: SimpleProps) {
	useDockGuard("Header");
	return (
		<div className={`${s.header}${className ? ` ${className}` : ""}`}>
			{children}
		</div>
	);
}

/** Тело — горизонтальный ряд: внутрь кладут Left, Center и Right */
function Body({ children, className }: SimpleProps) {
	useDockGuard("Body");
	return (
		<div className={`${s.body}${className ? ` ${className}` : ""}`}>
			{children}
		</div>
	);
}

interface SideProps {
	children?: ReactNode;
	defaultWidth?: number;
	min?: number;
	max?: number;
	className?: string;
}

/** Блок 1 — левая панель, ресайз по горизонтали */
function Left({
	children,
	defaultWidth = 280,
	min = 160,
	max = 600,
	className,
}: SideProps) {
	useDockGuard("Left");
	const ref = useRef<HTMLDivElement>(null);
	const onDrag = useResizeHandle(ref, {
		axis: "x",
		initial: defaultWidth,
		min,
		max,
		sign: 1,
	});

	return (
		<>
			<div
				ref={ref}
				className={`${s.side}${className ? ` ${className}` : ""}`}
				style={{ width: defaultWidth }}
			>
				{children}
			</div>
			<div className={s.colHandle} onMouseDown={onDrag} />
		</>
	);
}

/** Блок 3 — правая панель, ресайз по горизонтали */
function Right({
	children,
	defaultWidth = 280,
	min = 160,
	max = 600,
	className,
}: SideProps) {
	useDockGuard("Right");
	const ref = useRef<HTMLDivElement>(null);
	const onDrag = useResizeHandle(ref, {
		axis: "x",
		initial: defaultWidth,
		min,
		max,
		sign: -1,
	});

	return (
		<>
			<div className={s.colHandle} onMouseDown={onDrag} />
			<div
				ref={ref}
				className={`${s.side}${className ? ` ${className}` : ""}`}
				style={{ width: defaultWidth }}
			>
				{children}
			</div>
		</>
	);
}

interface CenterProps {
	children: ReactNode;
	className?: string;
}

/** Центральная колонка: внутрь кладут Main и Bottom */
function Center({ children, className }: CenterProps) {
	useDockGuard("Center");
	return (
		<div className={`${s.center}${className ? ` ${className}` : ""}`}>
			{children}
		</div>
	);
}

/** Главный контент — занимает всё оставшееся место */
function Main({ children, className }: CenterProps) {
	useDockGuard("Main");
	return (
		<div className={`${s.main}${className ? ` ${className}` : ""}`}>
			{children}
		</div>
	);
}

interface BottomProps {
	children?: ReactNode;
	defaultHeight?: number;
	min?: number;
	max?: number;
	className?: string;
}

/** Блок 2 — нижняя панель, ресайз по вертикали */
function Bottom({
	children,
	defaultHeight = 240,
	min = 120,
	max = 600,
	className,
}: BottomProps) {
	useDockGuard("Bottom");
	const ref = useRef<HTMLDivElement>(null);
	const onDrag = useResizeHandle(ref, {
		axis: "y",
		initial: defaultHeight,
		min,
		max,
		sign: -1,
	});

	return (
		<>
			<div className={s.rowHandle} onMouseDown={onDrag} />
			<div
				ref={ref}
				className={`${s.bottom}${className ? ` ${className}` : ""}`}
				style={{ height: defaultHeight }}
			>
				{children}
			</div>
		</>
	);
}

/* ------------------------------------------------------------------ */
/* Публичный API — составной компонент в стиле Radix                   */
/* ------------------------------------------------------------------ */

export const DockLayout = {
	Root,
	Header,
	Body,
	Left,
	Center,
	Main,
	Bottom,
	Right,
};
