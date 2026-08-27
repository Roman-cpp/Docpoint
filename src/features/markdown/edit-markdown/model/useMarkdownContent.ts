import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/core/toast";
import type { Markdown } from "@/entities/markdown";
import { getMarkdownApi, updateMarkdownApi } from "@/entities/markdown";

export type SaveStatus = "loading" | "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 600;

/**
 * Читает markdown-документ и сохраняет правки с задержкой. Текст, не успевший
 * уйти на диск к моменту смены документа или размонтирования, дописывается
 * принудительно — быстрый переход не должен глотать последние нажатия.
 *
 * `doc` равен `null`, когда узла нет или это документ другого вида: страница
 * должна сказать об этом, а не показать пустой редактор.
 */
export function useMarkdownContent(id: string) {
	const [doc, setDoc] = useState<Markdown | null>(null);
	const [content, setContent] = useState("");
	const [status, setStatus] = useState<SaveStatus>("loading");

	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Последний текст, о записи которого ещё нет подтверждения.
	const pending = useRef<string | null>(null);

	const flush = useCallback((docId: string) => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		if (pending.current === null) return;
		const text = pending.current;
		pending.current = null;
		void updateMarkdownApi(docId, text).catch(() => {
			setStatus("error");
			toast({ title: "Не удалось сохранить документ", variant: "error" });
		});
	}, []);

	useEffect(() => {
		if (!id) return;

		let cancelled = false;
		setStatus("loading");
		getMarkdownApi(id)
			.then((markdown) => {
				if (cancelled) return;
				setDoc(markdown);
				setContent(markdown?.content ?? "");
				setStatus("idle");
			})
			.catch(() => {
				if (cancelled) return;
				setStatus("error");
				toast({ title: "Не удалось открыть документ", variant: "error" });
			});

		return () => {
			cancelled = true;
			flush(id);
		};
	}, [id, flush]);

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
					await updateMarkdownApi(id, next);
					setStatus("saved");
				} catch {
					setStatus("error");
					toast({ title: "Не удалось сохранить документ", variant: "error" });
				}
			}, SAVE_DEBOUNCE_MS);
		},
		[id],
	);

	return { doc, content, status, onChange };
}
