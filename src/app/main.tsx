import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { useDocaStore } from "@/features/doca/store/useDocaStore";
import { RouterProvider } from "react-router";
import { router } from "./route";
import { Toaster } from "@/core/toast";

useDocaStore.getState().init();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
);
