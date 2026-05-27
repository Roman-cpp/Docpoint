import { type ReactNode, useCallback, useRef } from "react";
import s from "./SplitPane.module.css";

interface SplitPaneProps {
	/** Главный контент — занимает всё оставшееся пространство */
	children: ReactNode;

	/** Левая ресайзируемая панель */
	left?: ReactNode;
	leftWidth?: number;
	leftMin?: number;
	leftMax?: number;
	/** Скрыть левую панель и её разделитель */
	leftVisible?: boolean;

	/** Правая ресайзируемая панель */
	right?: ReactNode;
	rightWidth?: number;
	rightMin?: number;
	rightMax?: number;
	/** Скрыть правую панель и её разделитель */
	rightVisible?: boolean;

	className?: string;
}

function usePanelDrag(
	ref: React.RefObject<HTMLDivElement | null>,
	opts: { initialWidth: number; min: number; max: number; sign: 1 | -1 },
) {
	return useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			const startX = e.clientX;
			const startW = ref.current?.offsetWidth ?? opts.initialWidth;

			const onMove = (ev: MouseEvent) => {
				const w = Math.max(
					opts.min,
					Math.min(opts.max, startW + opts.sign * (ev.clientX - startX)),
				);
				if (ref.current) ref.current.style.width = `${w}px`;
			};
			const onUp = () => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[opts.initialWidth, opts.min, opts.max, opts.sign],
	);
}

export function SplitPane({
	children,
	left,
	leftWidth = 300,
	leftMin = 160,
	leftMax = 600,
	leftVisible = true,
	right,
	rightWidth = 300,
	rightMin = 160,
	rightMax = 600,
	rightVisible = true,
	className,
}: SplitPaneProps) {
	const leftRef = useRef<HTMLDivElement>(null);
	const rightRef = useRef<HTMLDivElement>(null);

	const onLeftDrag = usePanelDrag(leftRef, {
		initialWidth: leftWidth,
		min: leftMin,
		max: leftMax,
		sign: 1,
	});

	const onRightDrag = usePanelDrag(rightRef, {
		initialWidth: rightWidth,
		min: rightMin,
		max: rightMax,
		sign: -1,
	});

	const showLeft = !!left && leftVisible;
	const showRight = !!right && rightVisible;

	return (
		<div className={`${s.root}${className ? ` ${className}` : ""}`}>
			{showLeft && (
				<div
					ref={leftRef}
					style={{ width: leftWidth, flexShrink: 0, overflow: "hidden" }}
				>
					{left}
				</div>
			)}

			{showLeft && (
				<div className={s.handle} onMouseDown={onLeftDrag} />
			)}

			<div className={s.main}>{children}</div>

			{showRight && (
				<div className={s.handle} onMouseDown={onRightDrag} />
			)}

			{showRight && (
				<div
					ref={rightRef}
					style={{ width: rightWidth, flexShrink: 0, overflow: "hidden" }}
				>
					{right}
				</div>
			)}
		</div>
	);
}
