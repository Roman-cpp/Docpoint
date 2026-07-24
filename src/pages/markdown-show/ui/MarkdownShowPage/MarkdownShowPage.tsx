import {
	type ComponentPropsWithoutRef,
	type FC,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { useNavigate, useSearchParams } from "react-router";
import remarkGfm from "remark-gfm";
import { toast } from "@/core/toast";
import { parseScopeKey } from "@/entities/shared/file-scope";
import { exportMarkdownApi, type Markdown } from "@/entities/vault";
import { cx } from "@/shared/lib/cx";
import { MarkdownEditor } from "@/shared/ui-kit/MarkdownEditor";
import { Header } from "@/widgets/header";
import { extractToc, nodeToText, slugify } from "../../lib/toc";
import type { MarkdownFile } from "../../model/sampleFiles";
import {
	type SaveStatus,
	useMarkdownContent,
} from "../../model/useMarkdownContent";
import { FileSidebar } from "../FileSidebar";
import { BackIcon, CopyIcon, DocIcon, DownloadIcon } from "../icons";
import s from "../MarkdownShowPage.module.css";

type View = "rendered" | "edit";

const STATUS_LABEL: Record<SaveStatus, string> = {
	loading: "Загрузка…",
	idle: "",
	saving: "Сохранение…",
	saved: "Сохранено",
	error: "Ошибка сохранения",
};

/* ─── Code block with copy button ─── */
const CodeBlock: FC<{ lang: string; code: string }> = ({ lang, code }) => {
	const [copied, setCopied] = useState(false);

	const copy = () => {
		navigator.clipboard?.writeText(code).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1400);
	};

	return (
		<div className={s.pre}>
			<div className={s.preHead}>
				<span className={s.preLang}>{lang}</span>
				<button type="button" className={s.preCopy} onClick={copy}>
					{copied ? "скопировано" : "копировать"}
				</button>
			</div>
			<pre>
				<code>{code}</code>
			</pre>
		</div>
	);
};

/* ─── Markdown → custom components ─── */
const heading = (Tag: "h1" | "h2" | "h3" | "h4") => {
	const Heading: FC<{ children?: ReactNode }> = ({ children }) => (
		<Tag id={slugify(nodeToText(children))}>{children}</Tag>
	);
	return Heading;
};

const mdComponents: Components = {
	h1: heading("h1"),
	h2: heading("h2"),
	h3: heading("h3"),
	h4: heading("h4"),
	// `pre` is rendered by the code block itself — pass through to avoid nesting.
	pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
	code: ({ className, children }: ComponentPropsWithoutRef<"code">) => {
		const text = nodeToText(children);
		const match = /language-(\w+)/.exec(className ?? "");
		const isBlock = match !== null || text.includes("\n");
		if (!isBlock) {
			return <code className={s.inlineCode}>{children}</code>;
		}
		return (
			<CodeBlock lang={match?.[1] ?? "text"} code={text.replace(/\n$/, "")} />
		);
	},
};

/* 129024 → "126 КБ" (binary, ru locale). */
const formatBytes = (bytes: number): string => {
	const units = ["Б", "КБ", "МБ", "ГБ"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const rounded =
		value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
	return `${rounded.toLocaleString("ru-RU")} ${units[unit]}`;
};

/* Folder shown in the viewer's breadcrumb — the scope root has no name. */
const parentFolder = (path: string): string => {
	const slash = path.lastIndexOf("/");
	return slash === -1 ? "Файлы" : path.slice(0, slash);
};

/* Map a file read from the vault into the viewer's display shape. */
const toViewFile = (md: Markdown): MarkdownFile => ({
	id: md.path,
	folder: parentFolder(md.path),
	name: md.name,
	size: formatBytes(md.size),
	updated: new Date(md.updated * 1000).toLocaleString("ru-RU", {
		dateStyle: "medium",
		timeStyle: "short",
	}),
	content: md.content,
});

/* ═══════════════ MAIN PAGE ═══════════════ */
export const MarkdownShowPage: FC = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	// A scope-relative path means nothing on its own, so the scope travels with
	// it in the URL. Either half missing means no real file is open.
	const scopeParam = searchParams.get("scope");
	const fileParam = searchParams.get("file");
	const scope = useMemo(
		() => (scopeParam ? parseScopeKey(scopeParam) : null),
		[scopeParam],
	);
	const [view, setView] = useState<View>("rendered");
	const [activeHeading, setActiveHeading] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const readerRef = useRef<HTMLDivElement>(null);

	// Load the real vault file named in `?file=<id>` and autosave edits to disk.
	// Resolves to `null` when the param is absent or the file can't be read, so
	// the page falls back to the read-only sample browser.
	const {
		file: vaultFile,
		content: vaultContent,
		status,
		onChange,
	} = useMarkdownContent(scope, fileParam);
	const isVault = vaultFile !== null;

	// Sample files are read-only — never expose the editor for them.
	const effectiveView: View = isVault || view !== "edit" ? view : "rendered";

	const file: MarkdownFile | null = vaultFile
		? { ...toViewFile(vaultFile), content: vaultContent }
		: null;
	const toc = useMemo(() => (file ? extractToc(file.content) : []), [file]);

	// Render the document once per file/view — keeps scroll-spy state changes
	// from re-parsing the whole Markdown tree on every scroll frame.
	const docBody = useMemo(
		() => (
			<div className={s.rendered}>
				<ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
					{file?.content ?? ""}
				</ReactMarkdown>
			</div>
		),
		[file, effectiveView],
	);

	// Scroll-spy for the TOC — throttled with rAF to avoid layout thrash.
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
			setActiveHeading(current);
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

	const goTo = (id: string) => {
		const el = readerRef.current?.querySelector<HTMLElement>(
			`#${CSS.escape(id)}`,
		);
		// `scrollIntoView` targets the right scroll container and honours the
		// `scroll-margin-top` set on headings, so it lands below the sticky toolbar.
		el?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	const copyAll = () => {
		if (!file) return;
		navigator.clipboard?.writeText(file.content).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	// Export the current document through the native "save file" dialog.
	const exportFile = async () => {
		if (!file) return;
		const name = file.name.toLowerCase().endsWith(".md")
			? file.name
			: `${file.name}.md`;
		try {
			await exportMarkdownApi(file.content, name);
		} catch (err) {
			toast({
				variant: "error",
				title: "Не удалось экспортировать файл",
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	return (
		<div className={s.frame}>
			<Header section="Документы / Markdown" activeLink="docs" />

			<div className={s.body}>
				{/* ─── File browser ─── */}
				{scope && <FileSidebar scope={scope} activePath={fileParam} />}

				{/* ─── Reader ─── */}
				<div className={s.reader} ref={readerRef}>
					<div className={s.toolbar}>
						<button
							type="button"
							className={s.toolBtn}
							onClick={() => navigate(-1)}
						>
							<BackIcon /> Назад
						</button>
						<div className={s.bc}>
							{file ? (
								<>
									<span className={s.bcItem}>{file.folder}</span>
									<span className={s.bcSep}>/</span>
									<span className={s.bcCur}>{file.name}</span>
								</>
							) : (
								<span className={s.bcCur}>Файл не выбран</span>
							)}
						</div>
						<div className={s.toolbarActions}>
							{effectiveView === "edit" && (
								<span className={s.saveStatus}>{STATUS_LABEL[status]}</span>
							)}
							<div className={s.toolSeg}>
								<button
									type="button"
									className={cx(effectiveView === "rendered" && s.segActive)}
									onClick={() => setView("rendered")}
								>
									Просмотр
								</button>
								{/* Editing only applies to real vault files. */}
								{isVault && (
									<button
										type="button"
										className={cx(effectiveView === "edit" && s.segActive)}
										onClick={() => setView("edit")}
									>
										Редактировать
									</button>
								)}
							</div>
							<button type="button" className={s.toolBtn} onClick={copyAll}>
								<CopyIcon /> {copied ? "Скопировано" : "Копировать"}
							</button>
							<button
								type="button"
								className={s.toolBtn}
								onClick={exportFile}
								disabled={!file}
							>
								<DownloadIcon /> Экспортировать
							</button>
						</div>
					</div>

					<div className={s.readerRow}>
						<div className={s.docWrap}>
							<div className={s.doc}>
								{file ? (
									<>
										<div className={s.docMeta}>
											<span className={s.pill}>
												<DocIcon /> {file.name}
											</span>
											<span className={s.sep}>·</span>
											<span>{file.size}</span>
											<span className={s.sep}>·</span>
											<span>обновлён {file.updated}</span>
										</div>

										{effectiveView === "edit" ? (
											<MarkdownEditor
												value={vaultContent}
												onChange={onChange}
												className={s.editorHost}
											/>
										) : (
											docBody
										)}
									</>
								) : (
									<p className={s.docMeta}>Файл не найден или не выбран</p>
								)}
							</div>
						</div>

						{/* ─── TOC ─── */}
						{effectiveView === "rendered" && toc.length > 0 && (
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
