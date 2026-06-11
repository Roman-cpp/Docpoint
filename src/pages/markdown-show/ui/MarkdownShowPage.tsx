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
import { useSearchParams } from "react-router";
import remarkGfm from "remark-gfm";
import {
	type MarkdownContent,
	readMarkdownApi,
} from "@/entities/file-explorer";
import { cx } from "@/shared/lib/cx";
import { Header } from "@/widgets/header";
import { extractToc, nodeToText, slugify } from "../lib/toc";
import { type MarkdownFile, MD_FILES } from "../model/sampleFiles";
import { CopyIcon, DocIcon, DownloadIcon } from "./icons";
import s from "./MarkdownShowPage.module.css";
import { Sidebar } from "./Sidebar";

type View = "rendered" | "raw";

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

/* Map a file read from the vault into the viewer's display shape. */
const toViewFile = (md: MarkdownContent): MarkdownFile => ({
	id: md.id,
	folder: md.folder || "Файлы",
	name: md.name,
	size: formatBytes(md.size),
	updated: new Date(md.updated * 1000).toLocaleString("ru-RU", {
		dateStyle: "medium",
		timeStyle: "short",
	}),
	author: md.author || "—",
	content: md.content,
});

/* ═══════════════ MAIN PAGE ═══════════════ */
export const MarkdownShowPage: FC = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const fileParam = searchParams.get("file");
	const [loaded, setLoaded] = useState<MarkdownFile | null>(null);
	const [activeId, setActiveId] = useState(MD_FILES[0].id);
	const [query, setQuery] = useState("");
	const [view, setView] = useState<View>("rendered");
	const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
	const [activeHeading, setActiveHeading] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const readerRef = useRef<HTMLDivElement>(null);

	// Load the real vault file named in `?file=<id>`; falls back to the sample
	// browser when the param is absent or the file can't be read.
	useEffect(() => {
		if (!fileParam) {
			setLoaded(null);
			return;
		}
		let cancelled = false;
		readMarkdownApi(fileParam)
			.then((md) => {
				if (!cancelled) setLoaded(md ? toViewFile(md) : null);
			})
			.catch(() => {
				if (!cancelled) setLoaded(null);
			});
		return () => {
			cancelled = true;
		};
	}, [fileParam]);

	const file = loaded ?? MD_FILES.find((f) => f.id === activeId) ?? MD_FILES[0];
	const toc = useMemo(() => extractToc(file.content), [file.content]);

	// Render the document once per file/view — keeps scroll-spy state changes
	// from re-parsing the whole Markdown tree on every scroll frame.
	const docBody = useMemo(
		() =>
			view === "rendered" ? (
				<div className={s.rendered}>
					<ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
						{file.content}
					</ReactMarkdown>
				</div>
			) : (
				<div className={s.raw}>{file.content}</div>
			),
		[file.content, view],
	);

	// Group files by folder, filtered by search.
	const groups = useMemo(() => {
		const q = query.toLowerCase();
		const map: Record<string, typeof MD_FILES> = {};
		for (const f of MD_FILES) {
			if (
				q &&
				!f.name.toLowerCase().includes(q) &&
				!f.content.toLowerCase().includes(q)
			) {
				continue;
			}
			if (!map[f.folder]) map[f.folder] = [];
			map[f.folder].push(f);
		}
		return map;
	}, [query]);

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
		navigator.clipboard?.writeText(file.content).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	const selectFile = (id: string) => {
		setActiveId(id);
		setView("rendered");
		setLoaded(null);
		if (fileParam) setSearchParams({}, { replace: true });
	};

	return (
		<div className={s.frame}>
			<Header section="Документы / Markdown" activeLink="docs" />

			<div className={s.body}>
				<Sidebar
					totalCount={MD_FILES.length}
					query={query}
					onQueryChange={setQuery}
					groups={groups}
					openFolders={openFolders}
					onToggleFolder={(folder) =>
						setOpenFolders((p) => ({ ...p, [folder]: p[folder] === false }))
					}
					activeId={loaded ? "" : activeId}
					onSelectFile={selectFile}
				/>

				{/* ─── Reader ─── */}
				<div className={s.reader} ref={readerRef}>
					<div className={s.toolbar}>
						<div className={s.bc}>
							<span className={s.bcItem}>{file.folder}</span>
							<span className={s.bcSep}>/</span>
							<span className={s.bcCur}>{file.name}</span>
						</div>
						<div className={s.toolbarActions}>
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
									className={cx(view === "raw" && s.segActive)}
									onClick={() => setView("raw")}
								>
									Исходник
								</button>
							</div>
							<button type="button" className={s.toolBtn} onClick={copyAll}>
								<CopyIcon /> {copied ? "Скопировано" : "Копировать"}
							</button>
							<button type="button" className={s.toolBtn}>
								<DownloadIcon /> Скачать
							</button>
						</div>
					</div>

					<div className={s.readerRow}>
						<div className={s.docWrap}>
							<div className={s.doc}>
								<div className={s.docMeta}>
									<span className={s.pill}>
										<DocIcon /> {file.name}
									</span>
									<span className={s.sep}>·</span>
									<span>{file.size}</span>
									<span className={s.sep}>·</span>
									<span>обновлён {file.updated}</span>
									<span className={s.sep}>·</span>
									<span>{file.author}</span>
								</div>

								{docBody}
							</div>
						</div>

						{/* ─── TOC ─── */}
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
