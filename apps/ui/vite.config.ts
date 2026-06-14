import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Inline source maps let the e2e suite map V8 coverage back to source.
    // Off by default (production), enabled for the e2e image via build arg.
    sourcemap: process.env.BANALIZE_UI_SOURCEMAP === "true" ? "inline" : false,
  },
  server: {
    proxy: {
      "/api": process.env.BANALIZE_UI_API_URL ?? "http://localhost:6040",
    },
  },
  preview: {
    host: true,
    port: Number(process.env.BANALIZE_UI_PORT ?? 6041),
    proxy: {
      "/api": process.env.BANALIZE_UI_API_URL ?? "http://localhost:6040",
    },
  },
});
