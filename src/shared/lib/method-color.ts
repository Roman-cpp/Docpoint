export interface MethodStyle {
	color: string;
	bg: string;
}

const METHOD_STYLES: Record<string, MethodStyle> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
	HEAD: { color: "var(--delete)", bg: "var(--delete-bg)" },
};

const METHOD_STYLE_FALLBACK: MethodStyle = {
	color: "var(--ink-mid)",
	bg: "var(--bg)",
};

export function getMethodStyle(method: string): MethodStyle {
	return METHOD_STYLES[method] ?? METHOD_STYLE_FALLBACK;
}
