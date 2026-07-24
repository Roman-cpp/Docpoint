import type { ReactNode } from "react";

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
export function nodeToText(children: ReactNode): string {
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
