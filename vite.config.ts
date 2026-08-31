import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
	plugins: [react()],
	resolve: {
		alias: {
			"@": new URL("./src", import.meta.url).pathname,

			// Локальный wasm-модуль подключён алиасом прямо на выхлоп
			// wasm-pack, а не зависимостью в package.json. Причин две.
			//
			// 1. В реестре npm уже есть чужой пакет с именем `canvas-wasm`, и
			//    любой `bun install` затирал им локальную сборку в node_modules.
			//    Алиас разрешается раньше node_modules, коллизия исключена.
			// 2. Файл лежит вне node_modules, поэтому esbuild не пре-бандлит его
			//    и не переписывает `import.meta.url` — `new URL("…_bg.wasm",
			//    import.meta.url)` внутри обвязки продолжает находить .wasm.
			//
			// Пересобрать: `bun run wasm`.
			"canvas-wasm": new URL(
				"./wasm/pkg/canvas/canvas_wasm.js",
				import.meta.url,
			).pathname,
		},
	},

	optimizeDeps: {
		// The markdown renderer is code-split, so Vite would only discover this
		// graph the first time a document is opened — and then re-optimise with a
		// full page reload in the middle of the session. Keep in sync with
		// shared/ui-kit/MarkdownView/lib/highlighter.ts.
		include: [
			"react-markdown",
			"remark-gfm",
			"@shikijs/rehype/core",
			"shiki/core",
			"shiki/engine/oniguruma",
			"shiki/wasm",
			"@shikijs/themes/github-light",
			"@shikijs/themes/github-dark",
			"@shikijs/langs/bash",
			"@shikijs/langs/css",
			"@shikijs/langs/html",
			"@shikijs/langs/javascript",
			"@shikijs/langs/json",
			"@shikijs/langs/markdown",
			"@shikijs/langs/python",
			"@shikijs/langs/rust",
			"@shikijs/langs/sql",
			"@shikijs/langs/toml",
			"@shikijs/langs/tsx",
			"@shikijs/langs/typescript",
			"@shikijs/langs/yaml",
		],
	},

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent Vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			// 3. tell Vite to ignore watching `src-tauri`
			ignored: ["**/src-tauri/**"],
		},
		proxy: {
			"/api": {
				target: "http://localhost:8100",
				changeOrigin: true,
			},
		},
	},
}));
