import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import type { FileScope } from "@/entities/shared/file-scope";
import {
	getMarkdownApi,
	type Markdown,
	updateMarkdownApi,
} from "@/entities/vault";

export type SaveStatus = "loading" | "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 600;

/**
 * Load a markdown file from `scope` and autosave edits to disk with debounce.
 * A `null` scope or path clears the state (no real file open). Any text still
 * pending when the file changes or the component unmounts is flushed, so a
 * quick navigation never drops the last keystrokes.
 */
export function useMarkdownContent(
	scope: FileScope | null,
	path: string | null,
) {
	const [file, setFile] = useState<Markdown | null>(null);
	const [content, setContent] = useState("");
	const [status, setStatus] = useState<SaveStatus>("idle");

	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Latest text not yet confirmed written — used to flush on unmount/switch.
	const pending = useRef<string | null>(null);
	// Where to persist edits, captured from the loaded file.
	const target = useRef<{ scope: FileScope; path: string } | null>(null);

	const flush = useCallback(() => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		if (pending.current === null || !target.current) return;
		const text = pending.current;
		const { scope: at, path: filePath } = target.current;
		pending.current = null;
		void updateMarkdownApi(at, filePath, text).catch(() => {
			setStatus("error");
			toast({ title: "Не удалось сохранить файл", variant: "error" });
		});
	}, []);

	useEffect(() => {
		if (!scope || !path) {
			setFile(null);
			setContent("");
			setStatus("idle");
			target.current = null;
			return;
		}

		let cancelled = false;
		setStatus("loading");
		getMarkdownApi(scope, path)
			.then((md) => {
				if (cancelled) return;
				setFile(md);
				setContent(md?.content ?? "");
				target.current = md ? { scope, path: md.path } : null;
				setStatus("idle");
			})
			.catch(() => {
				if (cancelled) return;
				setStatus("error");
				toast({ title: "Не удалось открыть файл", variant: "error" });
			});

		return () => {
			cancelled = true;
			flush();
		};
	}, [scope, path, flush]);

	const onChange = useCallback((next: string) => {
		setContent(next);
		if (!target.current) return;
		const { scope: at, path: filePath } = target.current;
		setStatus("saving");
		pending.current = next;

		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(async () => {
			timer.current = null;
			pending.current = null;
			try {
				await updateMarkdownApi(at, filePath, next);
				setStatus("saved");
			} catch {
				setStatus("error");
				toast({ title: "Не удалось сохранить файл", variant: "error" });
			}
		}, SAVE_DEBOUNCE_MS);
	}, []);

	return { file, content, status, onChange };
}
