import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "@/core/toast";
import {
	createRelationApi,
	deleteRelationApi,
	type Entity,
	type EntityPosition,
	type EntityRelation,
	getErdEntitiesApi,
	getRelationsApi,
	type RelationEndpoints,
	updateEntityPositionsApi,
} from "@/entities/doc-erd";
import {
	type CreatedTable,
	CreateTableModal,
	EditTableModal,
} from "@/features/doc-erd";
import { CatalogBackLink } from "@/widgets/catalog-explorer";
import { Header } from "@/widgets/layout";
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
	// Схема, по которой построен холст: сцена рисует таблицы, но их поля,
	// описания и типы живут только здесь — форме правки нужны именно они.
	const [entities, setEntities] = useState<Entity[]>([]);
	const [relations, setRelations] = useState<EntityRelation[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const reloadRef = useRef<(() => Promise<void>) | null>(null);

	const editing = entities.find((e) => e.id === editingId) ?? null;

	// The modal persists the entity first, so by the time this runs the table
	// exists in the schema and only needs drawing.
	const handleCreated = (table: CreatedTable) => {
		const scene = sceneRef.current;
		if (!scene) return;
		scene.add_table(table);
		renderRef.current?.();
		flushRef.current?.();
		// Сцена таблицу уже нарисовала, но её поля нужны форме правки — и они
		// живут в схеме, а не на холсте.
		void reloadRef.current?.();
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

		// Перерисовка через кадр анимации, а не прямо в обработчике события.
		//
		// Мышь шлёт события чаще, чем экран успевает обновиться, и синхронная
		// отрисовка складывала их в очередь быстрее, чем та разгребалась, —
		// окно переставало отвечать на схеме в сотню таблиц. Теперь событие
		// только помечает сцену грязной, а рисуется она не чаще раза за кадр,
		// уже из последней позиции курсора.
		let frame = 0;
		const draw = () => {
			frame = 0;
			if (!scene) return;
			scene.render(ctx);
		};
		const requestDraw = () => {
			if (frame === 0) frame = requestAnimationFrame(draw);
		};

		// Курсор пишем только на смену: присваивание style дёргает пересчёт
		// стилей, а состояние курсора меняется куда реже, чем идут события.
		let cursor = "";
		const applyCursor = () => {
			if (!scene) return;
			const next = scene.cursor();
			if (next !== cursor) {
				cursor = next;
				canvas.style.cursor = next;
			}
		};

		// Перечитывание диаграммы из базы: после правки таблицы проще собрать
		// сцену заново, чем чинить её по месту. Связи адресуются позициями
		// колонок, и правка полей сдвигает их все разом; к тому же бэкенд при
		// этом сам убирает связи на исчезнувшие колонки — после перечитывания
		// холст показывает ровно то, что лежит в базе. Камера при этом на месте:
		// `Scene::load` её не трогает.
		const reload = async () => {
			if (!id || !scene) return;
			// Сперва дожидаемся незаписанных позиций: иначе только что созданная
			// таблица прочиталась бы из базы без координат, и автолейаут увёл бы
			// её из-под курсора в угол сетки.
			flush();
			await writes;
			if (disposed || scene !== sceneRef.current) return;

			const [nextEntities, nextRelations] = await Promise.all([
				getErdEntitiesApi({ docErdId: id }),
				getRelationsApi({ docErdId: id }),
			]);
			if (disposed || scene !== sceneRef.current) return;
			setEntities(nextEntities);
			setRelations(nextRelations);
			scene.load(nextEntities, nextRelations);
			requestDraw();
			// Сущностям без сохранённой позиции её только что назначил
			// автолейаут — закрепляем результат, чтобы он не пересчитывался при
			// каждом открытии.
			flush();
		};
		reloadRef.current = reload;

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
			requestDraw();
		};

		const handleMouseDown = (e: MouseEvent) => {
			if (e.button !== 0 || !scene) return;
			const { x, y } = getPos(e);
			scene.on_mouse_down(x, y);
			applyCursor();
			requestDraw();
			// Клик по крестику на связи удаляет её ещё в mousedown.
			flush();
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!scene) return;
			const { x, y } = getPos(e);
			const dirty = scene.on_mouse_move(x, y);
			applyCursor();
			if (dirty) requestDraw();
		};

		const handleMouseUp = (e: MouseEvent) => {
			if (!scene) return;
			const { x, y } = getPos(e);
			const dirty = scene.on_mouse_up(x, y);
			applyCursor();
			if (dirty) requestDraw();
			// Здесь оседают и конец перетаскивания таблицы, и новая связь.
			flush();
		};

		const handleDoubleClick = () => {
			// Выделение проставил mousedown, пришедший перед двойным кликом, —
			// сцену достаточно спросить. Повторный `on_mouse_down` здесь начал
			// бы перетаскивание, которое некому завершить: своего mouseup у
			// двойного клика нет, и таблица поехала бы за курсором.
			const picked = scene?.selected_id();
			if (picked) setEditingId(picked);
		};

		const handleWheel = (e: WheelEvent) => {
			if (!scene) return;
			e.preventDefault();
			const { x, y } = getPos(e);
			// Smaller exponent => gentler zoom per notch.
			const factor = Math.exp(-e.deltaY * 0.0015);
			scene.zoom(x, y, factor);
			requestDraw();
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
			renderRef.current = requestDraw;
			flushRef.current = flush;

			// Populate the diagram from the ERD's persisted schema. Without an id
			// there is nothing to show, so the scene stays empty.
			if (id) {
				await reload();
			}
			resize();
			// Сущностям без сохранённой позиции её только что назначил
			// автолейаут — закрепляем результат, чтобы он не пересчитывался при
			// каждом открытии.
			flush();
		});

		canvas.addEventListener("mousedown", handleMouseDown);
		canvas.addEventListener("dblclick", handleDoubleClick);
		canvas.addEventListener("wheel", handleWheel, { passive: false });
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		window.addEventListener("resize", resize);

		return () => {
			disposed = true;
			if (frame !== 0) cancelAnimationFrame(frame);
			canvas.removeEventListener("mousedown", handleMouseDown);
			canvas.removeEventListener("dblclick", handleDoubleClick);
			canvas.removeEventListener("wheel", handleWheel);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			window.removeEventListener("resize", resize);
			scene?.free();
			scene = null;
			sceneRef.current = null;
			renderRef.current = null;
			flushRef.current = null;
			reloadRef.current = null;
		};
	}, [id]);

	return (
		<div className={styles.frame}>
			<Header section="Документы / ERD" activeLink="docs" />

			<div className={styles.page}>
				{id && <CatalogBackLink nodeId={id} className={styles.back} />}
				<div className={styles.toolbar}>
					<p className={styles.hint}>
						Тяните от поля к полю — связь · двойной клик по таблице — правка ·
						клик по связи, затем ✕ — удалить · колесо — масштаб
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

			<EditTableModal
				open={!!editing}
				onOpenChange={(next) => !next && setEditingId(null)}
				table={editing}
				relations={relations}
				onSaved={() => {
					setEditingId(null);
					void reloadRef.current?.();
				}}
			/>
		</div>
	);
}
