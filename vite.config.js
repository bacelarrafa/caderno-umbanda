import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" deixa os caminhos relativos, que é como o GitHub Pages
// serve um site de projeto (https://usuario.github.io/nome-do-repo/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  worker: { format: "es" },
  optimizeDeps: { exclude: ["@huggingface/transformers"] },
});
