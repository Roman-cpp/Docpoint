import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/**
 * Visual styling of rendered markdown tokens. Combined with {@link livePreview}
 * (which hides the markdown markers themselves), this gives the Obsidian-like
 * "live preview" feel: `**bold**` reads as bold text, `# Heading` as a heading.
 */
export const markdownHighlight = HighlightStyle.define([
	{
		tag: t.heading1,
		fontSize: "1.7em",
		fontWeight: "600",
		fontFamily: "var(--font-serif)",
		lineHeight: "1.3",
	},
	{
		tag: t.heading2,
		fontSize: "1.45em",
		fontWeight: "600",
		fontFamily: "var(--font-serif)",
		lineHeight: "1.3",
	},
	{
		tag: t.heading3,
		fontSize: "1.25em",
		fontWeight: "600",
		fontFamily: "var(--font-serif)",
	},
	{ tag: t.heading4, fontSize: "1.1em", fontWeight: "600" },
	{ tag: [t.heading5, t.heading6], fontWeight: "600" },
	{ tag: t.strong, fontWeight: "700" },
	{ tag: t.emphasis, fontStyle: "italic" },
	{ tag: t.strikethrough, textDecoration: "line-through" },
	{ tag: t.link, color: "var(--blue)", textDecoration: "underline" },
	{ tag: t.url, color: "var(--ink-low)" },
	{
		tag: t.monospace,
		fontFamily: "var(--font-mono)",
		fontSize: "0.9em",
		color: "var(--code-ink)",
		background: "var(--code-bg)",
		borderRadius: "var(--r-xs)",
		padding: "0.1em 0.3em",
	},
	{ tag: t.quote, color: "var(--ink-mid)", fontStyle: "italic" },
	{ tag: [t.processingInstruction, t.meta], color: "var(--ink-low)" },
]);

/** Editor chrome — fonts, spacing, caret/selection colors mapped to app tokens. */
export const editorTheme = EditorView.theme({
	"&": {
		fontFamily: "var(--font-sans)",
		fontSize: "var(--fs-15)",
		color: "var(--ink)",
		background: "transparent",
		height: "100%",
	},
	"&.cm-focused": { outline: "none" },
	".cm-scroller": {
		fontFamily: "var(--font-sans)",
		lineHeight: "var(--lh-body)",
		overflow: "auto",
	},
	".cm-content": {
		padding: "16px 0 40vh",
		maxWidth: "780px",
		margin: "0 auto",
		caretColor: "var(--ink)",
	},
	".cm-line": { padding: "0 2px" },
	"&.cm-focused .cm-cursor": { borderLeftColor: "var(--ink)" },
	"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
		{
			background: "var(--cat-bg)",
		},
	".cm-blockquote": {
		borderLeft: "3px solid var(--border-h)",
		paddingLeft: "12px",
		color: "var(--ink-mid)",
	},
});
