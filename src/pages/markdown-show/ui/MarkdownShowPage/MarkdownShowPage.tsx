import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "@/core/toast";
import {
	catalogRoute,
	nodePath,
	useCatalogNode,
	useCatalogTree,
} from "@/entities/catalog";
import { exportMarkdownApi, withMarkdownExt } from "@/entities/markdown";
import { type SaveStatus, useMarkdownContent } from "@/features/markdown";
import { cx } from "@/shared/lib/cx";
import { ChevronLeftIcon, CopyIcon, DocIcon, DownloadIcon } from "@/shared/svg";
import { MarkdownEditor } from "@/shared/ui-kit/MarkdownEditor";
import { MarkdownView } from "@/shared/ui-kit/MarkdownView";
import { Header } from "@/widgets/header";
import { extractToc } from "../../lib/toc";
import s from "../MarkdownShowPage.module.css";
import { SiblingSidebar } from "../SiblingSidebar";

type View = "rendered" | "edit";

const STATUS_LABEL: Record<SaveStatus, string> = {
	loading: "Загрузка…",
	idle: "",
	saving: "Сохранение…",
	saved: "Сохранено",
	error: "Ошибка сохранения",
};

/** «2026-08-27 09:14:00» из БД → «27 авг. 2026 г., 09:14». Время хранится в UTC. */
const formatUpdated = (value: string): string => {
	const date = new Date(`${value.replace(" ", "T")}Z`);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
};

/**
 * Читалка markdown-документа дерева: слева соседи по каталогу, в центре текст
 * или редактор с автосохранением, справа оглавление.
 */
export const MarkdownShowPage: FC = () => {
	const { id = "" } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { node } = useCatalogNode(id);
	const { nodes } = useCatalogTree(node?.platformId ?? "");
	const { doc, content, status, onChange } = useMarkdownContent(id);

	const [view, setView] = useState<View>("rendered");
	const [activeHeading, setActiveHeading] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const readerRef = useRef<HTMLDivElement>(null);

	// Оба мемо держатся за сам текст, а не за `doc`: последний — новый объект на
	// каждый рендер, и мемоизация просто не сработала бы.
	const toc = useMemo(() => extractToc(content), [content]);
	const docBody = useMemo(
		() => <MarkdownView>{content}</MarkdownView>,
		[content],
	);

	// Подсветка активного заголовка в оглавлении, троттлится через rAF.
	useEffect(() => {
		const root = readerRef.current;
		if (!root) return;
		let frame = 0;
		const measure = () => {
			frame = 0;
			const heads = [
				...root.querySelectorAll<HTMLElement>("h1[id],h2[id],h3[id],h4[id]"),
			];
			let current: string | null = null;
			for (const h of heads) {
				if (h.getBoundingClientRect().top < 140) current = h.id;
			}
			// Не трогаем состояние, пока заголовок тот же, — иначе каждый кадр
			// прокрутки перерисовывал бы страницу.
			setActiveHeading((prev) => (prev === current ? prev : current));
		};
		const onScroll = () => {
			if (frame) return;
			frame = requestAnimationFrame(measure);
		};
		root.addEventListener("scroll", onScroll, { passive: true });
		measure();
		return () => {
			root.removeEventListener("scroll", onScroll);
			if (frame) cancelAnimationFrame(frame);
		};
	}, []);

	const goTo = (headingId: string) => {
		const el = readerRef.current?.querySelector<HTMLElement>(
			`#${CSS.escape(headingId)}`,
		);
		// `scrollIntoView` попадает в нужный контейнер прокрутки и учитывает
		// `scroll-margin-top` заголовков — текст встаёт под липкой панелью.
		el?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	const copyAll = () => {
		if (!doc) return;
		navigator.clipboard?.writeText(content).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	/** Выгрузка документа наружу через системный диалог сохранения. */
	const exportFile = async () => {
		if (!doc) return;
		try {
			await exportMarkdownApi(content, withMarkdownExt(doc.name));
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось экспортировать файл",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const path = node ? nodePath(nodes, node.parentId) : [];
	const parent = path[path.length - 1];

	return (
		<div className={s.frame}>
			<Header section="Документы / Markdown" activeLink="docs" />

			<div className={s.body}>
				{node && <SiblingSidebar nodes={nodes} node={node} />}

				<div className={s.reader} ref={readerRef}>
					<div className={s.toolbar}>
						<button
							type="button"
							className={s.toolBtn}
							onClick={() =>
								node
									? navigate(catalogRoute(node.platformId, node.parentId))
									: navigate(-1)
							}
						>
							<ChevronLeftIcon size={13} /> Назад
						</button>

						<div className={s.bc}>
							{doc ? (
								<>
									<span className={s.bcItem}>
										{parent?.name ?? "Все документы"}
									</span>
									<span className={s.bcSep}>/</span>
									<span className={s.bcCur}>{doc.name}</span>
								</>
							) : (
								<span className={s.bcCur}>Документ не найден</span>
							)}
						</div>

						<div className={s.toolbarActions}>
							{view === "edit" && (
								<span className={s.saveStatus}>{STATUS_LABEL[status]}</span>
							)}
							<div className={s.toolSeg}>
								<button
									type="button"
									className={cx(view === "rendered" && s.segActive)}
									onClick={() => setView("rendered")}
								>
									Просмотр
								</button>
								<button
									type="button"
									className={cx(view === "edit" && s.segActive)}
									onClick={() => setView("edit")}
									disabled={!doc}
								>
									Редактировать
								</button>
							</div>
							<button
								type="button"
								className={s.toolBtn}
								onClick={copyAll}
								disabled={!doc}
							>
								<CopyIcon size={13} /> {copied ? "Скопировано" : "Копировать"}
							</button>
							<button
								type="button"
								className={s.toolBtn}
								onClick={exportFile}
								disabled={!doc}
							>
								<DownloadIcon size={13} /> Экспортировать
							</button>
						</div>
					</div>

					<div className={s.readerRow}>
						<div className={s.docWrap}>
							<div className={s.doc}>
								{doc ? (
									<>
										<div className={s.docMeta}>
											<span className={s.pill}>
												<DocIcon /> {doc.name}
											</span>
											<span className={s.sep}>·</span>
											<span>обновлён {formatUpdated(doc.updatedAt)}</span>
										</div>

										{view === "edit" ? (
											<MarkdownEditor
												value={content}
												onChange={onChange}
												className={s.editorHost}
											/>
										) : (
											docBody
										)}
									</>
								) : (
									<p className={s.docMeta}>
										{status === "loading"
											? "Загрузка документа…"
											: "Документ не найден"}
									</p>
								)}
							</div>
						</div>

						{view === "rendered" && toc.length > 0 && (
							<nav className={s.toc}>
								<div className={s.tocH}>На этой странице</div>
								<div className={s.tocList}>
									{toc.map((h) => (
										<button
											type="button"
											key={h.id}
											className={cx(
												s.tocItem,
												h.level === 3 && s.lvl3,
												h.level === 4 && s.lvl4,
												activeHeading === h.id && s.tocItemActive,
											)}
											onClick={() => goTo(h.id)}
										>
											{h.text}
										</button>
									))}
								</div>
							</nav>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
