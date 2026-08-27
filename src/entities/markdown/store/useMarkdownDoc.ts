import { useQuery } from "@tanstack/react-query";
import { getMarkdownApi } from "../api/get-markdown-api";
import type { Markdown } from "../model/markdown.entity";

export const markdownKeys = {
	all: ["markdown"] as const,
	doc: (id: string) => [...markdownKeys.all, id] as const,
};

/** Markdown-документ с телом. `null` — узел удалён или это документ другого
 *  вида: страница должна сказать об этом, а не показать пустой текст. */
export const useMarkdownDoc = (id: string) => {
	const doc = useQuery<Markdown | null>({
		queryKey: markdownKeys.doc(id),
		queryFn: () => getMarkdownApi(id),
		enabled: !!id,
	});

	return {
		doc: doc.data ?? null,
		isDocLoading: doc.isLoading,
		isDocError: doc.isError,
	};
};
