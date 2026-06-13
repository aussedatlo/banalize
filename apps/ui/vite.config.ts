import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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
