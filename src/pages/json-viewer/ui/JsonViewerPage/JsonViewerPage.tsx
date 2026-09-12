import {
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type Json,
	JsonTree,
	type JsonTreeHandle,
} from "@/shared/ui-kit/data-display";
import { Header } from "@/widgets/layout";
import s from "../JsonViewerPage.module.css";

/** Пауза после ввода, прежде чем парсить и перестраивать дерево */
const PARSE_DEBOUNCE_MS = 250;

interface ParseResult {
	data: Json | null;
	error: string | null;
}

const parseJson = (raw: string): ParseResult => {
	if (!raw.trim()) return { data: null, error: null };
	try {
		return { data: JSON.parse(raw) as Json, error: null };
	} catch (e) {
		return {
			data: null,
			error: e instanceof Error ? e.message : "Некорректный JSON",
		};
	}
};

/** Считает количество узлов (ключей + элементов) для строки статистики */
const countNodes = (v: Json): number => {
	if (v === null || typeof v !== "object") return 0;
	const children = Array.isArray(v) ? v : Object.values(v);
	return (
		children.length + children.reduce<number>((n, c) => n + countNodes(c), 0)
	);
};

export const JsonViewerPage: FC = () => {
	const [raw, setRaw] = useState("");
	// Парсим не на каждое нажатие клавиши, а после паузы: на большом JSON
	// JSON.parse + пересборка дерева заметно тормозят ввод.
	const [deferredRaw, setDeferredRaw] = useState("");
	const treeRef = useRef<JsonTreeHandle>(null);

	// Ширина левой панели в процентах; двигается перетаскиванием разделителя.
	const [inputWidth, setInputWidth] = useState(44);
	const bodyRef = useRef<HTMLDivElement>(null);

	const startResize = useCallback((e: React.PointerEvent) => {
		e.preventDefault();
		const onMove = (ev: PointerEvent) => {
			const body = bodyRef.current;
			if (!body) return;
			const rect = body.getBoundingClientRect();
			const pct = ((ev.clientX - rect.left) / rect.width) * 100;
			// Не даём панелям схлопнуться полностью.
			setInputWidth(Math.min(80, Math.max(20, pct)));
		};
		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	}, []);

	useEffect(() => {
		const id = setTimeout(() => setDeferredRaw(raw), PARSE_DEBOUNCE_MS);
		return () => clearTimeout(id);
	}, [raw]);

	const { data, error } = useMemo(() => parseJson(deferredRaw), [deferredRaw]);
	const hasData = data !== null && !error;

	const format = () => {
		if (data === null && error) return;
		try {
			setRaw(JSON.stringify(JSON.parse(raw), null, 2));
		} catch {
			/* невалидный JSON — кнопка и так недоступна */
		}
	};

	const minify = () => {
		try {
			setRaw(JSON.stringify(JSON.parse(raw)));
		} catch {
			/* no-op */
		}
	};

	// Полный обход дерева + подсчёт байт — только когда JSON реально изменился,
	// а не на каждый рендер страницы.
	const stats = useMemo(
		() =>
			data !== null
				? `${countNodes(data)} узлов · ${new Blob([deferredRaw]).size} байт`
				: null,
		[data, deferredRaw],
	);

	return (
		<div className={s.frame}>
			<Header section="Инструменты / JSON" activeLink="json" />

			<div className={s.body} ref={bodyRef}>
				{/* ─── Ввод ─── */}
				<section className={s.inputPane} style={{ width: `${inputWidth}%` }}>
					<div className={s.toolbar}>
						<span className={s.paneTitle}>Исходный JSON</span>
						<div className={s.toolActions}>
							<button
								type="button"
								className={s.toolBtn}
								onClick={format}
								disabled={!!error || !raw.trim()}
							>
								Форматировать
							</button>
							<button
								type="button"
								className={s.toolBtn}
								onClick={minify}
								disabled={!!error || !raw.trim()}
							>
								Свернуть
							</button>
							<button
								type="button"
								className={s.toolBtn}
								onClick={() => setRaw("")}
								disabled={!raw}
							>
								Очистить
							</button>
						</div>
					</div>
					<textarea
						className={s.editor}
						value={raw}
						onChange={(e) => setRaw(e.target.value)}
						placeholder="Вставьте сюда любой JSON…"
						spellCheck={false}
					/>
					<div className={`${s.statusBar} ${error ? s.statusError : ""}`}>
						{error
							? `Ошибка: ${error}`
							: raw.trim()
								? "Валидный JSON"
								: "Ожидание ввода"}
					</div>
				</section>

				{/* ─── Разделитель ─── */}
				<button
					type="button"
					className={s.resizer}
					onPointerDown={startResize}
					aria-label="Изменить ширину панелей"
				/>

				{/* ─── Просмотр ─── */}
				<section className={s.viewPane}>
					<div className={s.toolbar}>
						<span className={s.paneTitle}>
							Читаемый вид {stats && <span className={s.stats}>· {stats}</span>}
						</span>
						{hasData && !error && (
							<div className={s.toolActions}>
								<button
									type="button"
									className={s.toolBtn}
									onClick={() => treeRef.current?.expandAll()}
								>
									Развернуть всё
								</button>
								<button
									type="button"
									className={s.toolBtn}
									onClick={() => treeRef.current?.collapseAll()}
								>
									Свернуть всё
								</button>
							</div>
						)}
					</div>

					<div className={s.viewBody}>
						{error ? (
							<div className={s.placeholder}>
								<span className={s.placeholderIcon}>⚠</span>
								Не удалось разобрать JSON
								<span className={s.placeholderHint}>{error}</span>
							</div>
						) : data !== null ? (
							<JsonTree
								ref={treeRef}
								data={data}
								size="md"
								defaultExpandedDepth={2}
							/>
						) : (
							<div className={s.placeholder}>
								<span className={s.placeholderIcon}>{"{ }"}</span>
								Вставьте JSON слева, чтобы увидеть его здесь
							</div>
						)}
					</div>
				</section>
			</div>
		</div>
	);
};
