import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { renderApi } from "./server/render-api";
import { localAiApi } from "./server/local-ai-api";

export default defineConfig({
  plugins: [react(), localAiApi(), renderApi()],
  server: { host: "127.0.0.1" }
});
