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
					Component: (await import("@/pages/api-docs")).ApiDocsPage,
				}),
			},
			{
				path: "/architecture",
				lazy: async () => ({
					Component: (await import("@/pages/architecture")).ArchitecturePage,
				}),
			},
			{
				path: "/api-schemas",
				lazy: async () => ({
					Component: (await import("@/pages/api-schemas")).ApiSchemasPage,
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
