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
import remarkGfm from "remark-gfm";
import { cx } from "@/shared/lib/cx";
import { Header } from "@/widgets/header";
import { extractToc, nodeToText, slugify } from "../lib/toc";
import { MD_FILES } from "../model/sampleFiles";
import s from "./MarkdownShowPage.module.css";

type View = "rendered" | "raw";

/* ─── Icons ─── */
const SearchIcon: FC = () => (
	<svg
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		aria-hidden="true"
	>
		<circle cx="6.5" cy="6.5" r="4.5" />
		<path d="M10 10l3.5 3.5" />
	</svg>
);

const ChevronIcon: FC<{ open: boolean }> = ({ open }) => (
	<svg
		className={cx(s.chev, open && s.chevOpen)}
		viewBox="0 0 12 12"
		width="11"
		height="11"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M4.5 3l3 3-3 3" />
	</svg>
);

const DocIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M3 1.5h5L11 4.5v8H3z" />
		<path d="M8 1.5V4.5H11" />
		<path d="M5 7.5h4M5 9.5h4" />
	</svg>
);

const CopyIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<rect x="4.5" y="4.5" width="8" height="8" rx="1.5" />
		<path
			d="M9 4.5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v5a1 1 0 001 1h1.5"
			strokeLinecap="round"
		/>
	</svg>
);

const DownloadIcon: FC = () => (
	<svg
		viewBox="0 0 14 14"
		width="13"
		height="13"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M7 1.5v8M3.5 6.5L7 10l3.5-3.5M2 12.5h10" />
	</svg>
);

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

/* ═══════════════ MAIN PAGE ═══════════════ */
export const MarkdownShowPage: FC = () => {
	const [activeId, setActiveId] = useState(MD_FILES[0].id);
	const [query, setQuery] = useState("");
	const [view, setView] = useState<View>("rendered");
	const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
	const [activeHeading, setActiveHeading] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const readerRef = useRef<HTMLDivElement>(null);

	const file = MD_FILES.find((f) => f.id === activeId) ?? MD_FILES[0];
	const toc = useMemo(() => extractToc(file.content), [file.content]);

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

	// Scroll-spy for the TOC.
	useEffect(() => {
		const root = readerRef.current;
		if (!root) return;
		const onScroll = () => {
			const heads = [
				...root.querySelectorAll<HTMLElement>("h1[id],h2[id],h3[id],h4[id]"),
			];
			let current: string | null = null;
			for (const h of heads) {
				if (h.getBoundingClientRect().top < 140) current = h.id;
			}
			setActiveHeading(current);
		};
		root.addEventListener("scroll", onScroll);
		onScroll();
		return () => root.removeEventListener("scroll", onScroll);
	}, []);

	const goTo = (id: string) => {
		const root = readerRef.current;
		const el = root?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
		if (root && el)
			root.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
	};

	const copyAll = () => {
		navigator.clipboard?.writeText(file.content).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	const selectFile = (id: string) => {
		setActiveId(id);
		setView("rendered");
	};

	return (
		<div className={s.frame}>
			<Header section="Документы / Markdown" activeLink="docs" />

			<div className={s.body}>
				{/* ─── File tree ─── */}
				<aside className={s.tree}>
					<div className={s.treeHead}>
						<span className={s.treeHeadTitle}>Файлы · {MD_FILES.length}</span>
					</div>
					<div className={s.treeSearch}>
						<SearchIcon />
						<input
							placeholder="Поиск по файлам…"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>
					<div className={s.treeScroll}>
						{Object.keys(groups).map((folder) => {
							const open = openFolders[folder] !== false;
							return (
								<div className={s.treeGroup} key={folder}>
									<div
										className={s.treeFolder}
										onClick={() =>
											setOpenFolders((p) => ({ ...p, [folder]: !open }))
										}
									>
										<ChevronIcon open={open} />
										{folder}
									</div>
									{open && (
										<div className={s.treeFiles}>
											{groups[folder].map((f) => (
												<button
													type="button"
													key={f.id}
													className={cx(
														s.treeFile,
														activeId === f.id && s.treeFileActive,
													)}
													onClick={() => selectFile(f.id)}
												>
													<span className={s.treeFileIcon}>
														<DocIcon />
													</span>
													<span className={s.treeFileName}>{f.name}</span>
													<span className={s.treeFileMeta}>{f.size}</span>
												</button>
											))}
										</div>
									)}
								</div>
							);
						})}
						{Object.keys(groups).length === 0 && (
							<div className={s.treeEmpty}>Ничего не найдено</div>
						)}
					</div>
				</aside>

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

							{view === "rendered" ? (
								<div className={s.rendered}>
									<ReactMarkdown
										remarkPlugins={[remarkGfm]}
										components={mdComponents}
									>
										{file.content}
									</ReactMarkdown>
								</div>
							) : (
								<div className={s.raw}>{file.content}</div>
							)}
						</div>
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
	);
};
