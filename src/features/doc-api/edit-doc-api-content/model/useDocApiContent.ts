import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import { readDocContentApi, writeDocContentApi } from "@/entities/doc-api";

export type SaveStatus = "loading" | "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 600;

/**
 * Load a doc's markdown body and autosave edits to disk with debounce. Any text
 * still pending when the doc changes or the component unmounts is flushed so a
 * quick navigation never drops the last keystrokes.
 */
export function useDocApiContent(docId: string) {
	const [content, setContent] = useState("");
	const [status, setStatus] = useState<SaveStatus>("loading");

	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Latest text not yet confirmed written — used to flush on unmount/doc switch.
	const pending = useRef<string | null>(null);

	const flush = useCallback((id: string) => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		if (pending.current === null) return;
		const text = pending.current;
		pending.current = null;
		void writeDocContentApi(id, text).catch(() => {
			setStatus("error");
			toast({ title: "Не удалось сохранить документ", variant: "error" });
		});
	}, []);

	useEffect(() => {
		let cancelled = false;
		setStatus("loading");
		readDocContentApi(docId)
			.then((text) => {
				if (cancelled) return;
				setContent(text);
				setStatus("idle");
			})
			.catch(() => {
				if (cancelled) return;
				setStatus("error");
				toast({ title: "Не удалось открыть документ", variant: "error" });
			});

		return () => {
			cancelled = true;
			flush(docId);
		};
	}, [docId, flush]);

	const onChange = useCallback(
		(next: string) => {
			setContent(next);
			setStatus("saving");
			pending.current = next;

			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(async () => {
				timer.current = null;
				pending.current = null;
				try {
					await writeDocContentApi(docId, next);
					setStatus("saved");
				} catch {
					setStatus("error");
					toast({ title: "Не удалось сохранить документ", variant: "error" });
				}
			}, SAVE_DEBOUNCE_MS);
		},
		[docId],
	);

	return { content, status, onChange };
}
