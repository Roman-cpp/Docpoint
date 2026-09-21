import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "@/core/toast";
import {
	createRelationApi,
	deleteRelationApi,
	type Entity,
	type EntityPosition,
	type EntityRelation,
	type Frame,
	type FrameBounds,
	type FrameRect,
	getErdEntitiesApi,
	getErdFramesApi,
	getRelationsApi,
	type RelationEndpoints,
	updateEntityPositionsApi,
	updateFrameBoundsApi,
} from "@/entities/doc-erd";
import {
	type CreatedTable,
	CreateTableModal,
	createFrame,
	DrawFrameButton,
	EditFrameModal,
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
	frames: FrameBounds[];
}

export function DocErdShowPage() {
	const { id } = useParams<{ id: string }>();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// Holds the live scene and a bound render callback so toolbar actions
	// (outside the effect) can mutate and repaint the diagram.
	const sceneRef = useRef<import("canvas-wasm").Scene | null>(null);
	const renderRef = useRef<(() => void) | null>(null);
	const flushRef = useRef<(() => void) | null>(null);
	const beginDrawRef = useRef<(() => void) | null>(null);

	const [createOpen, setCreateOpen] = useState(false);
	// Схема, по которой построен холст: сцена рисует таблицы, но их поля,
	// описания и типы живут только здесь — форме правки нужны именно они.
	const [entities, setEntities] = useState<Entity[]>([]);
	const [relations, setRelations] = useState<EntityRelation[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	// Области холст рисует сам, но их подписи правит форма — а ей нужен список.
	const [frames, setFrames] = useState<Frame[]>([]);
	const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
	// Включён ли режим рисования области: подсвечивает кнопку в тулбаре.
	const [drawing, setDrawing] = useState(false);
	const reloadRef = useRef<(() => Promise<void>) | null>(null);

	const editing = entities.find((e) => e.id === editingId) ?? null;
	const editingFrame = frames.find((f) => f.id === editingFrameId) ?? null;

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
					if (pending.frames.length > 0) {
						await updateFrameBoundsApi(pending.frames);
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

			const [nextEntities, nextRelations, nextFrames] = await Promise.all([
				getErdEntitiesApi({ docErdId: id }),
				getRelationsApi({ docErdId: id }),
				getErdFramesApi({ docErdId: id }),
			]);
			if (disposed || scene !== sceneRef.current) return;
			setEntities(nextEntities);
			setRelations(nextRelations);
			setFrames(nextFrames);
			scene.load(nextEntities, nextRelations, nextFrames);
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

		// Включение режима рисования живёт здесь, а не в обработчике кнопки:
		// курсор холста ставит `applyCursor`, и он у эффекта свой.
		const beginDraw = () => {
			if (!scene) return;
			scene.begin_draw_frame();
			setDrawing(true);
			applyCursor();
		};

		// Протянутый прямоугольник превращается в область: сначала запись, потом
		// отрисовка — иначе при отказе бэкенда на холсте осталась бы область,
		// которой нет в базе. Форма открывается сразу: область без подписи
		// ничего не группирует.
		const addDrawnFrame = async (rect: FrameRect) => {
			// Сцену закрепляем до записи: пока команда идёт, эффект может
			// переехать на другую диаграмму — рисовать область на ней нельзя.
			const live = scene;
			if (!id || !live) return;
			const created = await createFrame({ docErdId: id, rect });
			if (!created || disposed || live !== sceneRef.current) return;
			live.add_frame(created);
			setFrames((prev) => [...prev, created]);
			requestDraw();
			setEditingFrameId(created.id);
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
			// Здесь оседают и конец перетаскивания таблицы, и новая связь, и
			// новые границы области вместе с уехавшими за ней таблицами.
			flush();
			// Режим рисования гаснет сам — и после нарисованного прямоугольника,
			// и после промаха, на котором черновика не осталось.
			setDrawing(scene.is_drawing());
			if (scene.has_draft()) {
				void addDrawnFrame(scene.take_draft() as FrameRect);
			}
		};

		const handleDoubleClick = () => {
			// Выделение проставил mousedown, пришедший перед двойным кликом, —
			// сцену достаточно спросить. Повторный `on_mouse_down` здесь начал
			// бы перетаскивание, которое некому завершить: своего mouseup у
			// двойного клика нет, и таблица поехала бы за курсором.
			const picked = scene?.selected_id();
			if (picked) {
				setEditingId(picked);
				return;
			}
			// Таблицы под курсором нет — значит, двойной клик пришёлся на
			// область: её выделил тот же mousedown.
			const frame = scene?.selected_frame_id();
			if (frame) setEditingFrameId(frame);
		};

		// Esc бросает незаконченный прямоугольник и выходит из режима рисования.
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || !scene) return;
			if (scene.cancel_draw_frame()) {
				setDrawing(false);
				applyCursor();
				requestDraw();
			}
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
			beginDrawRef.current = beginDraw;

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
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("resize", resize);

		return () => {
			disposed = true;
			if (frame !== 0) cancelAnimationFrame(frame);
			canvas.removeEventListener("mousedown", handleMouseDown);
			canvas.removeEventListener("dblclick", handleDoubleClick);
			canvas.removeEventListener("wheel", handleWheel);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("resize", resize);
			scene?.free();
			scene = null;
			sceneRef.current = null;
			renderRef.current = null;
			flushRef.current = null;
			beginDrawRef.current = null;
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
						{drawing
							? "Протяните прямоугольник по холсту — Esc отменяет"
							: "Тяните от поля к полю — связь · двойной клик по таблице или области — правка · клик по связи, затем ✕ — удалить · колесо — масштаб"}
					</p>
					<div className={styles.actions}>
						<DrawFrameButton
							active={drawing}
							disabled={!id}
							onClick={() => beginDrawRef.current?.()}
						/>
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

			{/* Область правится на месте, без перечитывания диаграммы: подпись и
			    удаление не трогают ни таблицы, ни связи. */}
			<EditFrameModal
				open={!!editingFrame}
				onOpenChange={(next) => !next && setEditingFrameId(null)}
				frame={editingFrame}
				onSaved={(title) => {
					if (!editingFrame) return;
					const frameId = editingFrame.id;
					setFrames((prev) =>
						prev.map((f) => (f.id === frameId ? { ...f, title } : f)),
					);
					sceneRef.current?.rename_frame(frameId, title);
					renderRef.current?.();
					setEditingFrameId(null);
				}}
				onDeleted={() => {
					if (!editingFrame) return;
					const frameId = editingFrame.id;
					setFrames((prev) => prev.filter((f) => f.id !== frameId));
					sceneRef.current?.remove_frame(frameId);
					renderRef.current?.();
					setEditingFrameId(null);
				}}
			/>
		</div>
	);
}
