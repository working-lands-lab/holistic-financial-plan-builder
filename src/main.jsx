// ABOUTME: Vite entry point — mounts the Planner app into the page.
// ABOUTME: Imports the global stylesheet that styles the whole UI.
import React from "react";
import { createRoot } from "react-dom/client";
import Planner from "@/components/Planner";
import "./globals.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Planner />
  </React.StrictMode>
);
