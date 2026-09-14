import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import type { Element, ElementContent } from "hast";
import type {
	ComponentProps,
	ComponentPropsWithoutRef,
	FC,
	ReactNode,
} from "react";
import { use, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cx } from "@/shared/lib/cx";
import { nodeToText, slugify } from "@/shared/lib/markdown";
import { getHighlighter } from "./lib/highlighter";
import s from "./MarkdownView.module.css";

type RehypePlugins = ComponentProps<typeof ReactMarkdown>["rehypePlugins"];
type PreProps = ComponentPropsWithoutRef<"pre"> & { node?: Element };
type CodeProps = ComponentPropsWithoutRef<"code"> & { node?: Element };

/* Declared outside the component: a fresh array on every render makes
   react-markdown re-parse the whole document. */
const REMARK_PLUGINS = [remarkGfm];

const SHIKI_OPTIONS = {
	themes: { light: "github-light", dark: "github-dark" },
	// Emit `--shiki-light` / `--shiki-dark` custom properties instead of a baked
	// in colour, so the theme is chosen in CSS — no re-render, no second
	// highlighting pass. See the `.shiki` rules in MarkdownView.module.css.
	defaultColor: false,
	// A fence with no language still goes through Shiki, so every block comes
	// out with the same markup.
	defaultLanguage: "text",
	// Shiki throws on a grammar it has not loaded: without a fallback a single
	// ```fortran fence takes down the whole document.
	fallbackLanguage: "text",
	// Puts `language-*` back on the <code>, which is how `code` below tells a
	// highlighted block apart from inline code.
	addLanguageClass: true,
	// A grammar the engine cannot compile must cost that one block its colours,
	// not take down the document. Shiki then leaves the original
	// <pre><code class="language-*"> in place, which the components below render
	// as an unhighlighted block.
	onError: (error: unknown) => {
		console.warn("[Markdown] highlighting failed for a code block", error);
	},
} as const;

const LANGUAGE_CLASS = /^language-(.+)$/;

/** Flatten a hast subtree to its text — Shiki's output is spans, not a string. */
const hastToText = (node: ElementContent): string => {
	if (node.type === "text") return node.value;
	if (node.type === "element") return node.children.map(hastToText).join("");
	return "";
};

/**
 * Classes of a hast node. Shiki hands back raw hast, where the property is
 * `class` and may be a string, rather than hast's canonical `className` array —
 * react-markdown normalises that on the way to React, but this reads the tree
 * before it gets there.
 */
const classList = (node: Element | undefined): string[] => {
	const raw = node?.properties?.className ?? node?.properties?.class;
	if (Array.isArray(raw)) {
		return raw.filter((cls): cls is string => typeof cls === "string");
	}
	return typeof raw === "string" ? raw.split(/\s+/) : [];
};

/** The fence's language, read back off the class `addLanguageClass` restores. */
const codeLanguage = (pre: Element | undefined): string => {
	const code = pre?.children.find(
		(child): child is Element =>
			child.type === "element" && child.tagName === "code",
	);
	for (const cls of classList(code)) {
		const match = LANGUAGE_CLASS.exec(cls);
		if (match?.[1]) return match[1];
	}
	return "text";
};

/* ─── Code block: project frame and copy button around Shiki's <pre> ─── */
const CodeBlock: FC<{ lang: string; code: string; children: ReactNode }> = ({
	lang,
	code,
	children,
}) => {
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
			{children}
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
	// A table wider than the column scrolls inside its own box instead of
	// pushing past the document's edge.
	table: ({ children }: { children?: ReactNode }) => (
		<div className={s.tableWrap}>
			<table>{children}</table>
		</div>
	),
	// Shiki has already replaced this <pre> with its own, carrying the `shiki`
	// class and the theme's custom properties — pass both through untouched and
	// only add the frame around it. The copy button needs the plain source, so
	// it is read back out of the highlighted tree.
	pre: ({ node, children, ...rest }: PreProps) => (
		<CodeBlock lang={codeLanguage(node)} code={node ? hastToText(node) : ""}>
			<pre {...rest}>{children}</pre>
		</CodeBlock>
	),
	code: ({ node, className, children, ...rest }: CodeProps) => {
		// Every highlighted block is marked by `addLanguageClass`; anything
		// without the class is inline code.
		if (className?.includes("language-")) {
			return (
				<code {...rest} className={className}>
					{children}
				</code>
			);
		}
		return <code className={s.inlineCode}>{children}</code>;
	},
};

interface MarkdownDocumentProps {
	/** Raw markdown source. */
	children: string;
	className?: string;
}

/**
 * The renderer itself — loaded lazily by [`MarkdownView`], which also owns the
 * Suspense boundary `use()` below needs.
 */
export const MarkdownDocument: FC<MarkdownDocumentProps> = ({
	children,
	className,
}) => {
	const highlighter = use(getHighlighter());

	const rehypePlugins = useMemo<RehypePlugins>(
		() => [[rehypeShikiFromHighlighter, highlighter, SHIKI_OPTIONS]],
		[highlighter],
	);

	return (
		<div className={cx(s.rendered, className)}>
			<ReactMarkdown
				remarkPlugins={REMARK_PLUGINS}
				rehypePlugins={rehypePlugins}
				components={mdComponents}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
};
