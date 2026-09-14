import type { HttpMethod } from "@/entities/shared/http-method";

export const METHOD_CFG: Record<HttpMethod, { color: string; bg: string }> = {
	GET: { color: "var(--get)", bg: "var(--get-bg)" },
	POST: { color: "var(--post)", bg: "var(--post-bg)" },
	PUT: { color: "var(--put)", bg: "var(--put-bg)" },
	PATCH: { color: "var(--patch)", bg: "var(--patch-bg)" },
	DELETE: { color: "var(--delete)", bg: "var(--delete-bg)" },
	HEAD: { color: "var(--ink-mid)", bg: "var(--cat-bg)" },
};
