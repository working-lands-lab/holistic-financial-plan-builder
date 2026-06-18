// ABOUTME: Vite build config for the Holistic Financial Plan Builder.
// ABOUTME: Sets the deploy base path and the "@" import alias to the repo root.
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Must match the path the app is embedded under on the Savory AI Collab site
  // and the GitHub Pages project-site path. See AGENTS.md before changing.
  base: "/holistic-financial-plan-builder/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
