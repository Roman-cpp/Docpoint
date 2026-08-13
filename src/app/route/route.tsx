import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
	{
		HydrateFallback: () => "Loading...",
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
				path: "/domain-show/:id",
				lazy: async () => ({
					Component: (await import("@/pages/domain-show")).DomainShowPage,
				}),
			},
			{
				path: "/markdown-show",
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
				path: "/http-history",
				lazy: async () => ({
					Component: (await import("@/pages/http-history")).HttpHistoryPage,
				}),
			},
			{
				path: "/domains",
				lazy: async () => ({
					Component: (await import("@/pages/domains")).DomainsPage,
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
