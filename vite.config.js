// ABOUTME: Vite build config for the Holistic Financial Plan Builder.
// ABOUTME: Sets the deploy base path and the "@" import alias to the repo root.
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Served from a sub-path, not the domain root (the default matches the repo
  // name, which suits a GitHub Pages project site). Change to match your deploy
  // path; see AGENTS.md.
  base: "/holistic-financial-plan-builder/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
