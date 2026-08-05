import { useEffect, useRef } from "react";
import { Link, useLocation, useParams } from "react-router";
import {
	type CreateEntityDTO,
	createErdEntityApi,
	getErdEntitiesApi,
	getRelationsApi,
	type SchemaField,
} from "@/entities/doc-erd";
import { Header } from "@/widgets/header";
import styles from "../CanvasPage.module.css";

/** Builds a schema field with the editor's defaults, overriding as needed. */
const field = (over: Partial<SchemaField> & { name: string }): SchemaField => ({
	type: "string",
	req: false,
	nullable: false,
	pk: false,
	desc: "",
	note: "",
	example: "",
	...over,
});

/**
 * Mirrors the wasm `Table::from_template` blank table (DEFAULT_COLUMNS) so the
 * persisted entity matches what `add_table` draws on the canvas.
 */
const blankEntity = (name: string): CreateEntityDTO => ({
	name,
	desc: "",
	fields: [
		field({ name: "id", type: "uuid", req: true, pk: true }),
		field({ name: "created_at", type: "timestamp", req: true }),
		field({ name: "updated_at", type: "timestamp", req: true }),
	],
});

interface ErdOrigin {
	domainId?: string;
	domainName?: string;
}

export function DocErdShowPage() {
	const { id } = useParams<{ id: string }>();
	// When the ERD was opened from a domain page, `state` carries it so we
	// can offer a link back to that domain.
	const origin = useLocation().state as ErdOrigin | null;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// Holds the live scene and a bound render callback so toolbar actions
	// (outside the effect) can mutate and repaint the diagram.
	const sceneRef = useRef<import("canvas-wasm").Scene | null>(null);
	const renderRef = useRef<(() => void) | null>(null);

	const handleAddTable = () => {
		const scene = sceneRef.current;
		if (!scene) return;
		scene.add_table();
		renderRef.current?.();

		// Persist the freshly-added table as a new entity. The wasm names it
		// `new_table_{count}` after pushing, so `table_count()` gives that count.
		if (id) {
			createErdEntityApi(
				id,
				blankEntity(`new_table_${scene.table_count()}`),
			).catch((err) => console.error("Failed to persist new entity", err));
		}
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

			// Populate the diagram from the ERD's persisted schema. Without an id
			// there is nothing to show, so the scene stays empty.
			if (id) {
				const [entities, relations] = await Promise.all([
					getErdEntitiesApi(id),
					getRelationsApi(id),
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
		<div className={styles.frame}>
			<Header section="Документы / ERD" activeLink="docs" />

			<div className={styles.page}>
				{origin?.domainId && (
					<Link className={styles.back} to={`/domain-show/${origin.domainId}`}>
						← {origin.domainName ?? "Домен"}
					</Link>
				)}
				<div className={styles.toolbar}>
					<p className={styles.hint}>
						Тяните от поля к полю — связь · клик по связи, затем ✕ — удалить ·
						колесо — масштаб
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
		</div>
	);
}
