import React from "react";
import ReactDOM from "react-dom/client";
import "@/shared/styles/index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { installGlobalTraps } from "@/core/log";
import { Toaster } from "@/core/toast";
import { router } from "./route";

installGlobalTraps();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<Toaster />
		</QueryClientProvider>
	</React.StrictMode>,
);
