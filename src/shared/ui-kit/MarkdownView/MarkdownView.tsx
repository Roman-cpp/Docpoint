import type { FC } from "react";
import { lazy, Suspense } from "react";
import { cx } from "@/shared/lib/cx";
import s from "./MarkdownView.module.css";

// react-markdown, remark-gfm and the whole Shiki graph are only needed once a
// document is actually on screen, so they get their own chunk.
const MarkdownDocument = lazy(() =>
	import("./MarkdownDocument").then((module) => ({
		default: module.MarkdownDocument,
	})),
);

interface MarkdownViewProps {
	/** Raw markdown source. */
	children: string;
	className?: string;
}

/**
 * Rendered markdown document: GFM, Shiki-highlighted code blocks and headings
 * carrying the same anchor ids [`slugify`] produces, so a table of contents
 * built from the raw source can scroll to them.
 *
 * The renderer is code-split and suspends while the highlighter is built, so
 * the boundary lives here instead of at every call site.
 */
export const MarkdownView: FC<MarkdownViewProps> = ({
	children,
	className,
}) => (
	<Suspense fallback={<div className={cx(s.rendered, s.loading, className)} />}>
		<MarkdownDocument className={className}>{children}</MarkdownDocument>
	</Suspense>
);
