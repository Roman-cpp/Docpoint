import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "@/core/toast";
import {
	createRelationApi,
	deleteRelationApi,
	type EntityPosition,
	getErdEntitiesApi,
	getRelationsApi,
	type RelationEndpoints,
	updateEntityPositionsApi,
} from "@/entities/doc-erd";
import { type CreatedTable, CreateTableModal } from "@/features/doc-erd";
import { CatalogBackLink } from "@/widgets/catalog-explorer";
import { Header } from "@/widgets/header";
import styles from "../CanvasPage.module.css";

/**
 * Изменения, накопленные сценой с прошлого сброса (`Scene::take_pending`).
 * Сцена ничего не сохраняет сама — она лишь копит, что поменялось, а разложить
 * это по командам Tauri должна страница.
 */
interface ScenePending {
	moves: EntityPosition[];
	links: RelationEndpoints[];
	unlinks: RelationEndpoints[];
}

export function DocErdShowPage() {
	const { id } = useParams<{ id: string }>();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// Holds the live scene and a bound render callback so toolbar actions
	// (outside the effect) can mutate and repaint the diagram.
	const sceneRef = useRef<import("canvas-wasm").Scene | null>(null);
	const renderRef = useRef<(() => void) | null>(null);
	const flushRef = useRef<(() => void) | null>(null);

	const [createOpen, setCreateOpen] = useState(false);

	// The modal persists the entity first, so by the time this runs the table
	// exists in the schema and only needs drawing.
	const handleCreated = (table: CreatedTable) => {
		const scene = sceneRef.current;
		if (!scene) return;
		scene.add_table(table);
		renderRef.current?.();
		flushRef.current?.();
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let scene: import("canvas-wasm").Scene | null = null;
		let disposed = false;

		// Записи выстроены в цепочку, а не пущены параллельно: перетаскивание
		// сбрасывает позиции пачками, и обгон одного вызова другим оставил бы в
		// базе устаревшую координату. `.catch` в конце звена нужен, чтобы одна
		// неудачная запись не обрывала всю очередь.
		let writes: Promise<void> = Promise.resolve();

		const flush = () => {
			if (!scene?.has_pending()) return;
			const pending = scene.take_pending() as ScenePending;

			writes = writes
				.then(async () => {
					if (pending.moves.length > 0) {
						await updateEntityPositionsApi(pending.moves);
					}
					for (const link of pending.links) {
						await createRelationApi(link);
					}
					for (const unlink of pending.unlinks) {
						await deleteRelationApi(unlink);
					}
				})
				.catch((err: unknown) => {
					toast({
						variant: "error",
						title: "Не удалось сохранить диаграмму",
						description: err instanceof Error ? err.message : String(err),
					});
				});
		};

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
			// Клик по крестику на связи удаляет её ещё в mousedown.
			flush();
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
			// Здесь оседают и конец перетаскивания таблицы, и новая связь.
			flush();
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
			flushRef.current = flush;

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
			// Сущностям без сохранённой позиции её только что назначил
			// автолейаут — закрепляем результат, чтобы он не пересчитывался при
			// каждом открытии.
			flush();
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
			flushRef.current = null;
		};
	}, [id]);

	return (
		<div className={styles.frame}>
			<Header section="Документы / ERD" activeLink="docs" />

			<div className={styles.page}>
				{id && <CatalogBackLink nodeId={id} className={styles.back} />}
				<div className={styles.toolbar}>
					<p className={styles.hint}>
						Тяните от поля к полю — связь · клик по связи, затем ✕ — удалить ·
						колесо — масштаб
					</p>
					<button
						type="button"
						className={styles.addBtn}
						onClick={() => setCreateOpen(true)}
						disabled={!id}
					>
						<span className={styles.addBtnIcon} aria-hidden>
							+
						</span>
						Таблица
					</button>
				</div>
				<canvas ref={canvasRef} className={styles.canvas} />
			</div>

			{id && (
				<CreateTableModal
					open={createOpen}
					onOpenChange={setCreateOpen}
					docErdId={id}
					onCreated={handleCreated}
				/>
			)}
		</div>
	);
}
