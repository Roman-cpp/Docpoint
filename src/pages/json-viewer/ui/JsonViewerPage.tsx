import { type FC, useMemo, useState } from "react";
import { Header } from "@/widgets/header";
import { type Json, JsonTree } from "./JsonTree";
import s from "./JsonViewerPage.module.css";

const SAMPLE = `{
  "id": "pay_1a2b3c",
  "amount": 4200,
  "currency": "RUB",
  "paid": true,
  "customer": {
    "name": "Иван Петров",
    "email": "ivan@example.com",
    "vip": false
  },
  "items": [
    { "sku": "A-100", "qty": 2, "price": 1500 },
    { "sku": "B-220", "qty": 1, "price": 1200 }
  ],
  "metadata": null,
  "tags": ["online", "card"]
}`;

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
	// Толкаем при «развернуть/свернуть всё», чтобы пересобрать дерево.
	const [treeKey, setTreeKey] = useState(0);
	const [allOpen, setAllOpen] = useState(true);

	const { data, error } = useMemo(() => parseJson(raw), [raw]);
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

	const toggleAll = (open: boolean) => {
		setAllOpen(open);
		setTreeKey((k) => k + 1);
	};

	const stats =
		data !== null
			? `${countNodes(data)} узлов · ${new Blob([raw]).size} байт`
			: null;

	return (
		<div className={s.frame}>
			<Header section="Инструменты / JSON" activeLink="json" />

			<div className={s.body}>
				{/* ─── Ввод ─── */}
				<section className={s.inputPane}>
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
								onClick={() => setRaw(SAMPLE)}
							>
								Пример
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
									onClick={() => toggleAll(true)}
								>
									Развернуть всё
								</button>
								<button
									type="button"
									className={s.toolBtn}
									onClick={() => toggleAll(false)}
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
							<JsonTree key={treeKey} data={data} defaultOpen={allOpen} />
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
