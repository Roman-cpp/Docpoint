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
				path: "/endpoint/:id",
				lazy: async () => ({
					Component: (await import("@/pages/endpoint")).EndpointDetailPage,
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
