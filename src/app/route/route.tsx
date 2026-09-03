import { createBrowserRouter } from "react-router";
import { RouteError } from "@/core/log";

export const router = createBrowserRouter([
	{
		HydrateFallback: () => "Loading...",
		// Ошибка рендера любой страницы оседает здесь, а не в белом экране.
		ErrorBoundary: RouteError,
		children: [
			{
				path: "/",
				lazy: async () => ({
					Component: (await import("@/pages/home")).HomePage,
				}),
			},
			{
				path: "/doc-show/:id",
				lazy: async () => ({
					Component: (await import("@/pages/doc-api-show")).DocApiShowPage,
				}),
			},
			{
				path: "/platform-show/:id",
				lazy: async () => ({
					Component: (await import("@/pages/platform-show")).PlatformShowPage,
				}),
			},
			{
				path: "/markdown-show/:id",
				lazy: async () => ({
					Component: (await import("@/pages/markdown-show")).MarkdownShowPage,
				}),
			},
			{
				path: "/http-client",
				lazy: async () => ({
					Component: (await import("@/pages/http-client")).HttpClientPage,
				}),
			},
			{
				path: "/json-viewer",
				lazy: async () => ({
					Component: (await import("@/pages/json-viewer")).JsonViewerPage,
				}),
			},
			{
				path: "/unix-time",
				lazy: async () => ({
					Component: (await import("@/pages/unix-time")).UnixTimePage,
				}),
			},
			{
				path: "/http-history",
				lazy: async () => ({
					Component: (await import("@/pages/http-history")).HttpHistoryPage,
				}),
			},
			{
				path: "/endpoint-show/:id",
				lazy: async () => ({
					Component: (await import("@/pages/endpoint-show")).EndpointShowPage,
				}),
			},
			{
				path: "/environments",
				lazy: async () => ({
					Component: (await import("@/pages/environment")).EnvironmentPage,
				}),
			},
			{
				path: "/ws-client",
				lazy: async () => ({
					Component: (await import("@/pages/ws-client")).WsClientPage,
				}),
			},
			{
				path: "/doc-ws-show/:id",
				lazy: async () => ({
					Component: (await import("@/pages/doc-ws-show")).DocWsShowPage,
				}),
			},
			{
				path: "/doc-erd-show/:id",
				lazy: async () => ({
					Component: (await import("@/pages/doc-erd-show")).DocErdShowPage,
				}),
			},
		],
	},
]);
