import { slugify } from "@/shared/lib/markdown";

export interface TocEntry {
	level: number;
	text: string;
	id: string;
}

/** Extract a table of contents (h1–h4) from raw markdown, skipping code fences. */
export function extractToc(src: string): TocEntry[] {
	const lines = src.replace(/\r\n/g, "\n").split("\n");
	const toc: TocEntry[] = [];
	let inFence = false;

	for (const line of lines) {
		if (/^```/.test(line.trim())) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		const h = line.match(/^(#{1,4})\s+(.*)$/);
		if (h) {
			const level = h[1].length;
			const text = h[2].trim().replace(/[*_`]/g, "");
			toc.push({ level, text, id: slugify(text) });
		}
	}
	return toc;
}
