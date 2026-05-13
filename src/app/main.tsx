import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { useDocaStore } from "@/features/doca/store/useDocaStore";
import { RouterProvider } from "react-router";
import { router } from "./route";

useDocaStore.getState().init();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
