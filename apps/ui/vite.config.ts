import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import path from "path";
import { defineConfig } from "vite";

const { version } = JSON.parse(
  readFileSync(path.resolve(__dirname, "./package.json"), "utf-8"),
) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
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
