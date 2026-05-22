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
				path: "/color",
				lazy: async () => ({
					Component: (await import("@/pages/color")).EnvironmentPage,
				}),
			},
		],
	},
]);
