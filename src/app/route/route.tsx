import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
	{
		HydrateFallback: () => "Loading...",
		children: [
			{
				path: "/",
				lazy: async () => ({
					Component: (await import("@/pages/docs")).DocsPage,
				}),
			},
			{
				path: "/doc-show/:id",
				lazy: async () => ({
					Component: (await import("@/pages/doc-show")).DocShowPage,
				}),
			},
			{
				path: "/platform-show/:id",
				lazy: async () => ({
					Component: (await import("@/pages/platform-show")).PlatformShowPage,
				}),
			},
			// {
			// 	path: "/architecture",
			// 	lazy: async () => ({
			// 		Component: (await import("@/pages/architecture")).ArchitecturePage,
			// 	}),
			// },
			{
				path: "/entity",
				lazy: async () => ({
					Component: (await import("@/pages/entity")).EntityPage,
				}),
			},
			{
				path: "/http-client",
				lazy: async () => ({
					Component: (await import("@/pages/http-client")).HttpClientPage,
				}),
			},
			{
				path: "/http-history",
				lazy: async () => ({
					Component: (await import("@/pages/http-history")).HttpHistoryPage,
				}),
			},
			{
				path: "/logs",
				lazy: async () => ({
					Component: (await import("@/pages/logs")).LogsPage,
				}),
			},
			{
				path: "/services",
				lazy: async () => ({
					Component: (await import("@/pages/services")).ServicesPage,
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
		],
	},
]);
