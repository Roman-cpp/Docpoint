import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { useDocStore } from "@/features/doc/store/useDocStore";
import { RouterProvider } from "react-router";
import { router } from "./route";
import { Toaster } from "@/core/toast";

useDocStore.getState().init();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
);
