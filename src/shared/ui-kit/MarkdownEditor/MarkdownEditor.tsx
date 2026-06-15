import { markdown } from "@codemirror/lang-markdown";
import { syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { minimalSetup } from "codemirror";
import { type FC, useEffect, useRef } from "react";
import { livePreview } from "./livePreview";
import s from "./MarkdownEditor.module.css";
import { editorTheme, markdownHighlight } from "./markdownTheme";

interface MarkdownEditorProps {
	value: string;
	onChange: (value: string) => void;
	/** Disable live-preview marker hiding to read the raw markdown source. */
	rawSource?: boolean;
	className?: string;
}

/**
 * Obsidian-style markdown editor on CodeMirror 6. Controlled: `value` is the
 * markdown source, `onChange` fires on every edit. Live preview hides markdown
 * markers on inactive lines; the line under the cursor shows raw source.
 */
export const MarkdownEditor: FC<MarkdownEditorProps> = ({
	value,
	onChange,
	rawSource = false,
	className,
}) => {
	const host = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	// Keep the latest onChange without recreating the editor on every render.
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	// Create the editor once; feature flags that change extensions live below.
	// `value` is read only as the initial doc here — external updates are
	// reconciled by the effect below to avoid clobbering the cursor.
	// biome-ignore lint/correctness/useExhaustiveDependencies: value is the initial doc only
	useEffect(() => {
		if (!host.current) return;

		const state = EditorState.create({
			doc: value,
			extensions: [
				minimalSetup,
				markdown({ codeLanguages: languages }),
				EditorView.lineWrapping,
				syntaxHighlighting(markdownHighlight),
				...(rawSource ? [] : [livePreview]),
				editorTheme,
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						onChangeRef.current(update.state.doc.toString());
					}
				}),
			],
		});

		const view = new EditorView({ state, parent: host.current });
		viewRef.current = view;

		return () => {
			view.destroy();
			viewRef.current = null;
		};
	}, [rawSource]);

	// Reconcile external value changes (e.g. switching to another doc) without
	// resetting the editor when the change originated from typing here.
	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;
		const current = view.state.doc.toString();
		if (value === current) return;
		view.dispatch({
			changes: { from: 0, to: current.length, insert: value },
		});
	}, [value]);

	return <div ref={host} className={className ?? s.editor} />;
};
