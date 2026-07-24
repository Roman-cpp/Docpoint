import type { ComponentPropsWithoutRef, FC, ReactNode } from "react";
import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cx } from "@/shared/lib/cx";
import { nodeToText, slugify } from "@/shared/lib/markdown";
import s from "./MarkdownView.module.css";

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

interface MarkdownViewProps {
	/** Raw markdown source. */
	children: string;
	className?: string;
}

/**
 * Rendered markdown document: GFM, copyable code blocks and headings carrying
 * the same anchor ids [`slugify`] produces, so a table of contents built from
 * the raw source can scroll to them.
 */
export const MarkdownView: FC<MarkdownViewProps> = ({
	children,
	className,
}) => (
	<div className={cx(s.rendered, className)}>
		<ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
			{children}
		</ReactMarkdown>
	</div>
);
