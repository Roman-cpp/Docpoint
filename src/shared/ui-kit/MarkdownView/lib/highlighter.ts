import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

export type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

let highlighterPromise: Promise<Highlighter> | null = null;

/**
 * The Shiki highlighter shared by every rendered document.
 *
 * Built fine-grained — `shiki/core` plus explicit theme and grammar imports —
 * because the all-in-one `shiki` entry pulls in hundreds of grammars and dozens
 * of themes.
 *
 * The promise is cached rather than the resolved value: building a highlighter
 * is expensive, and `use()` in MarkdownDocument hangs forever if it is handed a
 * fresh promise on every render.
 */
export function getHighlighter(): Promise<Highlighter> {
	highlighterPromise ??= createHighlighterCore({
		themes: [
			import("@shikijs/themes/github-light"),
			import("@shikijs/themes/github-dark"),
		],
		// This list is what the renderer's chunk costs. A fence in a language
		// missing from it falls back to plain text, so adding a language means
		// an import here plus a matching entry in `optimizeDeps.include`.
		// Short names (`ts`, `js`, `sh`, `yml`) come with the grammars.
		langs: [
			import("@shikijs/langs/bash"),
			import("@shikijs/langs/css"),
			import("@shikijs/langs/html"),
			import("@shikijs/langs/javascript"),
			import("@shikijs/langs/json"),
			import("@shikijs/langs/markdown"),
			import("@shikijs/langs/python"),
			import("@shikijs/langs/rust"),
			import("@shikijs/langs/sql"),
			import("@shikijs/langs/toml"),
			import("@shikijs/langs/tsx"),
			import("@shikijs/langs/typescript"),
			import("@shikijs/langs/yaml"),
		],
		// Oniguruma, not `createJavaScriptRegexEngine`. The JavaScript engine is
		// the lighter option — it drops this ~500 KB WASM blob — but measured on
		// the grammars above it loses on both counts that matter here:
		//
		//   * Correctness. Its first pass over a document mis-tokenises and only
		//     a second pass comes out right (a TypeScript fence rendered every
		//     token in keyword red, then corrected itself). `forgiving`, eager
		//     pattern compilation and a warm-up pass each looked like a fix and
		//     none held up in a clean process.
		//   * Speed. First highlight of a 1300-line document: 3.8 s against
		//     0.8 s here; steady state 162 ms against 39 ms.
		//
		// The blob is inlined as base64 (`shiki/wasm`), so it costs bundle size
		// but no separate asset and no fetch — and this is a desktop app serving
		// its assets from disk, which is what makes that trade cheap.
		engine: createOnigurumaEngine(import("shiki/wasm")),
	});

	return highlighterPromise;
}
