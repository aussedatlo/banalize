import react from "@vitejs/plugin-react-swc";
// import path, { dirname } from "path";
// import { fileURLToPath } from "url";
import { defineConfig } from "vite";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  // resolve: {
  //   alias: {
  //     "@ui": path.resolve(__dirname, "../../packages/ui/src"),
  //   },
  // },
});
