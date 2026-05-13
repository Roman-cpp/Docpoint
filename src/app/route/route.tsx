import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
	{
		HydrateFallback: () => "Loading...",
		children: [
			{
				path: "/",
				lazy: async () => ({
					Component: (await import("@/pages/home")).ApiExplorerPage,
				}),
			},
			{
				path: "/docs",
				lazy: async () => ({
					Component: (await import("@/pages/docs")).DocsPage,
				}),
			},
			{
				path: "/architecture",
				lazy: async () => ({
					Component: (await import("@/pages/architecture")).ArchitecturePage,
				}),
			},
			{
				path: "/schema",
				lazy: async () => ({
					Component: (await import("@/pages/schema")).SchemaPage,
				}),
			},
			{
				path: "/http-client",
				lazy: async () => ({
					Component: (await import("@/pages/http-client")).HttpClientPage,
				}),
			},
			{
				path: "/endpoint/:id",
				lazy: async () => ({
					Component: (await import("@/pages/endpoint")).EndpointDetailPage,
				}),
			},
		],
	},
]);
