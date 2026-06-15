import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import {
	type MarkdownContent,
	readMarkdownApi,
	updateMarkdownApi,
} from "@/entities/file-explorer";

export type SaveStatus = "loading" | "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 600;

/**
 * Load a vault markdown file and autosave edits to disk with debounce. Passing
 * `null` clears the state (no real file open). Any text still pending when the
 * file changes or the component unmounts is flushed so a quick navigation never
 * drops the last keystrokes.
 */
export function useMarkdownContent(fileId: string | null) {
	const [file, setFile] = useState<MarkdownContent | null>(null);
	const [content, setContent] = useState("");
	const [status, setStatus] = useState<SaveStatus>("idle");

	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Latest text not yet confirmed written — used to flush on unmount/file switch.
	const pending = useRef<string | null>(null);
	// Id + author needed to persist edits, captured from the loaded file.
	const meta = useRef<{ id: string; author: string } | null>(null);

	const flush = useCallback(() => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		if (pending.current === null || !meta.current) return;
		const text = pending.current;
		const { id, author } = meta.current;
		pending.current = null;
		void updateMarkdownApi({ id, author, content: text }).catch(() => {
			setStatus("error");
			toast({ title: "Не удалось сохранить файл", variant: "error" });
		});
	}, []);

	useEffect(() => {
		if (!fileId) {
			setFile(null);
			setContent("");
			setStatus("idle");
			meta.current = null;
			return;
		}

		let cancelled = false;
		setStatus("loading");
		readMarkdownApi(fileId)
			.then((md) => {
				if (cancelled) return;
				setFile(md);
				setContent(md?.content ?? "");
				meta.current = md ? { id: md.id, author: md.author } : null;
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
	}, [fileId, flush]);

	const onChange = useCallback((next: string) => {
		setContent(next);
		if (!meta.current) return;
		const { id, author } = meta.current;
		setStatus("saving");
		pending.current = next;

		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(async () => {
			timer.current = null;
			pending.current = null;
			try {
				await updateMarkdownApi({ id, author, content: next });
				setStatus("saved");
			} catch {
				setStatus("error");
				toast({ title: "Не удалось сохранить файл", variant: "error" });
			}
		}, SAVE_DEBOUNCE_MS);
	}, []);

	return { file, content, status, onChange };
}
