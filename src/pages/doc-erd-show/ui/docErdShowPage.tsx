import { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { readEntitiesApi } from "@/entities/entity";
import { readRelationsApi } from "@/entities/entity-relation";
import styles from "./CanvasPage.module.css";

export function DocErdShowPage() {
	const { id } = useParams<{ id: string }>();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// Holds the live scene and a bound render callback so toolbar actions
	// (outside the effect) can mutate and repaint the diagram.
	const sceneRef = useRef<import("canvas-wasm").Scene | null>(null);
	const renderRef = useRef<(() => void) | null>(null);

	const handleAddTable = () => {
		sceneRef.current?.add_table();
		renderRef.current?.();
	};

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
			scene.on_mouse_down(x, y);
			canvas.style.cursor = scene.cursor();
			scene.render(ctx);
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!scene) return;
			const { x, y } = getPos(e);
			const dirty = scene.on_mouse_move(x, y);
			canvas.style.cursor = scene.cursor();
			if (dirty) scene.render(ctx);
		};

		const handleMouseUp = (e: MouseEvent) => {
			if (!scene) return;
			const { x, y } = getPos(e);
			const dirty = scene.on_mouse_up(x, y);
			canvas.style.cursor = scene.cursor();
			if (dirty) scene.render(ctx);
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

		import("canvas-wasm").then(async ({ default: init, Scene }) => {
			// `canvas-wasm` is built with wasm-pack's `web` target, so the wasm
			// module must be fetched and instantiated via `init()` before any
			// export is callable. `init` is idempotent, so repeated effect runs
			// reuse the already-instantiated module.
			await init();
			if (disposed) return;
			scene = new Scene();
			sceneRef.current = scene;
			renderRef.current = () => scene?.render(ctx);

			// Populate the diagram from the document's persisted schema. Without
			// an id there is nothing to show, so the scene stays empty.
			if (id) {
				const [entities, relations] = await Promise.all([
					readEntitiesApi(id),
					readRelationsApi(id),
				]);
				if (disposed || scene !== sceneRef.current) return;
				scene.load(entities, relations);
			}
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
			sceneRef.current = null;
			renderRef.current = null;
		};
	}, [id]);

	return (
		<div className={styles.page}>
			<div className={styles.toolbar}>
				<p className={styles.hint}>
					Тяните от поля к полю — связь · клик по связи, затем ✕ —
					удалить · колесо — масштаб
				</p>
				<button
					type="button"
					className={styles.addBtn}
					onClick={handleAddTable}
				>
					<span className={styles.addBtnIcon} aria-hidden>
						+
					</span>
					Таблица
				</button>
			</div>
			<canvas ref={canvasRef} className={styles.canvas} />
		</div>
	);
}
