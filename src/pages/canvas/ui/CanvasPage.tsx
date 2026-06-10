import { useEffect, useRef } from "react";
import styles from "./CanvasPage.module.css";

export function CanvasPage() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let scene: import("canvas-wasm").Scene | null = null;
		let disposed = false;

		// Pointer position in CSS pixels, relative to the canvas.
		const getPos = (e: MouseEvent) => {
			const bounds = canvas.getBoundingClientRect();
			return { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
		};

		// Matches the backing store to the element's CSS size at the current
		// devicePixelRatio so text stays crisp on hi-dpi displays.
		const resize = () => {
			if (!scene) return;
			const dpr = window.devicePixelRatio || 1;
			const cssW = canvas.clientWidth;
			const cssH = canvas.clientHeight;
			canvas.width = Math.round(cssW * dpr);
			canvas.height = Math.round(cssH * dpr);
			scene.resize(cssW, cssH, dpr);
			scene.render(ctx);
		};

		const handleMouseDown = (e: MouseEvent) => {
			if (e.button !== 0 || !scene) return;
			const { x, y } = getPos(e);
			const grabbed = scene.on_mouse_down(x, y);
			canvas.style.cursor = grabbed ? "grabbing" : "move";
			scene.render(ctx);
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!scene) return;
			const { x, y } = getPos(e);
			if (scene.on_mouse_move(x, y)) {
				scene.render(ctx);
				return;
			}
			canvas.style.cursor = scene.contains(x, y) ? "grab" : "default";
		};

		const handleMouseUp = () => {
			if (!scene) return;
			scene.on_mouse_up();
			canvas.style.cursor = "default";
		};

		const handleWheel = (e: WheelEvent) => {
			if (!scene) return;
			e.preventDefault();
			const { x, y } = getPos(e);
			// Smaller exponent => gentler zoom per notch.
			const factor = Math.exp(-e.deltaY * 0.0015);
			scene.zoom(x, y, factor);
			scene.render(ctx);
		};

		import("canvas-wasm").then(({ Scene }) => {
			if (disposed) return;
			scene = new Scene();
			resize();
		});

		canvas.addEventListener("mousedown", handleMouseDown);
		canvas.addEventListener("wheel", handleWheel, { passive: false });
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		window.addEventListener("resize", resize);

		return () => {
			disposed = true;
			canvas.removeEventListener("mousedown", handleMouseDown);
			canvas.removeEventListener("wheel", handleWheel);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			window.removeEventListener("resize", resize);
			scene?.free();
			scene = null;
		};
	}, []);

	return (
		<div className={styles.page}>
			<p className={styles.hint}>
				Перетаскивайте таблицы · колесо — масштаб · фон — панорама
			</p>
			<canvas ref={canvasRef} className={styles.canvas} />
		</div>
	);
}
