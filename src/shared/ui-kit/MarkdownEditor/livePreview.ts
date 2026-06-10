import { syntaxTree } from "@codemirror/language";
import { type Extension, RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view";

/**
 * Lezer-markdown node names for the "syntax" characters we hide in preview:
 * the `#` of headings, the `*`/`_` around emphasis, the backticks of code,
 * the `~~` of strikethrough and the `>` of blockquotes.
 */
const MARK_NODES = new Set([
	"HeaderMark",
	"EmphasisMark",
	"CodeMark",
	"StrikethroughMark",
	"QuoteMark",
]);

const hide = Decoration.replace({});

/**
 * Collect the 1-based line numbers that currently hold a cursor or selection.
 * Markers on these lines stay visible so the raw markdown can be edited — this
 * is the core of the Obsidian-style live preview.
 */
function activeLines(view: EditorView): Set<number> {
	const lines = new Set<number>();
	for (const range of view.state.selection.ranges) {
		const first = view.state.doc.lineAt(range.from).number;
		const last = view.state.doc.lineAt(range.to).number;
		for (let n = first; n <= last; n++) lines.add(n);
	}
	return lines;
}

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const active = activeLines(view);
	const { doc } = view.state;

	for (const { from, to } of view.visibleRanges) {
		syntaxTree(view.state).iterate({
			from,
			to,
			enter: (node) => {
				if (!MARK_NODES.has(node.name) || node.from === node.to) return;
				if (active.has(doc.lineAt(node.from).number)) return;

				// Swallow the single separating space after `#`/`>` so the heading or
				// quote text starts at the margin instead of being indented.
				let end = node.to;
				if (
					(node.name === "HeaderMark" || node.name === "QuoteMark") &&
					doc.sliceString(end, end + 1) === " "
				) {
					end += 1;
				}
				builder.add(node.from, end, hide);
			},
		});
	}
	return builder.finish();
}

/**
 * View plugin that recomputes which markdown markers to hide whenever the doc,
 * viewport or selection changes. Pair with `markdownHighlight` for styling.
 */
export const livePreview: Extension = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged || update.selectionSet) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);
