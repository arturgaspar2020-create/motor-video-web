import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { renderApi } from "./server/render-api";

export default defineConfig({
  plugins: [react(), renderApi()],
  server: { host: "127.0.0.1" }
});
