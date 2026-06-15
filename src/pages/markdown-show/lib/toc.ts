/** Slugify heading text into an anchor id (matches the template behaviour). */
export function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/[^\wа-яё\s-]/gi, "")
			.trim()
			.replace(/\s+/g, "-")
			.slice(0, 60) || "section"
	);
}

/** Flatten React markdown children into a plain string for slugging. */
export function nodeToText(children: React.ReactNode): string {
	if (children == null || children === false) return "";
	if (typeof children === "string" || typeof children === "number") {
		return String(children);
	}
	if (Array.isArray(children)) return children.map(nodeToText).join("");
	if (typeof children === "object" && "props" in children) {
		// biome-ignore lint/suspicious/noExplicitAny: react element children
		return nodeToText((children as any).props?.children);
	}
	return "";
}

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
